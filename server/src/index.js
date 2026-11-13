import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

app.use(cors({
  origin(origin, callback) {
    const allowed = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',').map(value => value.trim()).filter(Boolean);
    if (!origin || allowed.includes(origin) || process.env.NODE_ENV === 'production') return callback(null, true);
    return callback(new Error('This client origin is not allowed.'));
  }
}));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const text = value => typeof value === 'string' ? value.trim() : '';
const roles = (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  next();
};
const auth = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in first.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const account = await pool.query('SELECT status FROM users WHERE id=$1', [req.user.id]);
    if (!account.rows[0] || account.rows[0].status === 'suspended') {
      return res.status(401).json({ message: 'This account is no longer active. Please contact your institution.' });
    }
    req.user.status = account.rows[0].status;
    if (req.user.status === 'pending' && req.path !== '/api/auth/me') {
      return res.status(403).json({ message: 'Your account is awaiting institution verification.' });
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
});
const active = (req, res, next) => req.user?.status === 'active'
  ? next()
  : res.status(403).json({ message: 'Your account is awaiting verification or has been suspended.' });
const notify = async (userId, title, body) => {
  await pool.query('INSERT INTO notifications (user_id,title,body) VALUES ($1,$2,$3)', [userId,title,body]);
};
const notifyAdmins = async (title, body) => {
  const admins = await pool.query("SELECT id FROM users WHERE role='admin' AND status='active'");
  for (const admin of admins.rows) await notify(admin.id,title,body);
};
const issueToken = user => jwt.sign(
  { id:user.id, name:user.name, role:user.role, status:user.status },
  process.env.JWT_SECRET, { expiresIn:'12h' }
);
const safeCsv = value => {
  let output = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(output)) output = "'" + output;
  return '"' + output.replaceAll('"','""') + '"';
};

app.get('/api/health', asyncRoute(async (_req,res) => {
  await pool.query('SELECT 1');
  res.json({ status:'ok', service:'AlumniConnect', database:'connected' });
}));

// Public registration: only students, alumni and recruiters can self-register.
// Alumni and recruiters wait for institutional verification. Faculty/admin accounts are seeded or provisioned.
app.post('/api/auth/register', asyncRoute(async (req,res) => {
  const name = text(req.body.name);
  const email = text(req.body.email).toLowerCase();
  const password = req.body.password;
  const role = req.body.role || 'student';
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message:'Enter a valid name, email and password of at least 8 characters.' });
  }
  if (!['student','alumni','recruiter'].includes(role)) {
    return res.status(400).json({ message:'Public registration is available for students, alumni and recruiters only.' });
  }
  const status = role === 'student' ? 'active' : 'pending';
  const hash = await bcrypt.hash(password,12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      'INSERT INTO users (name,email,password_hash,role,status) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,status',
      [name,email,hash,role,status]
    );
    const user = created.rows[0];
    if (role === 'student') {
      await client.query(
        'INSERT INTO student_profiles (user_id,student_id,department,degree,current_year,graduation_year,skills,interests) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [user.id,text(req.body.student_id),text(req.body.department),text(req.body.degree),text(req.body.current_year),req.body.graduation_year || null,Array.isArray(req.body.skills)?req.body.skills:[],Array.isArray(req.body.interests)?req.body.interests:[]]
      );
    } else if (role === 'alumni') {
      await client.query(
        'INSERT INTO alumni_profiles (user_id,graduation_year,department,degree,company,job_title,location,linkedin_url,is_verified) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)',
        [user.id,Number(req.body.graduation_year)||new Date().getFullYear(),text(req.body.department)||'Not specified',text(req.body.degree),text(req.body.company),text(req.body.job_title),text(req.body.location),text(req.body.linkedin_url)]
      );
    } else {
      await client.query(
        'INSERT INTO recruiter_profiles (user_id,company,website,designation) VALUES ($1,$2,$3,$4)',
        [user.id,text(req.body.company),text(req.body.website),text(req.body.designation)]
      );
    }
    await client.query('COMMIT');
    if (status === 'pending') await notifyAdmins('New account awaiting verification',name+' registered as '+role+'.');
    res.status(201).json({ token:issueToken(user), user, message:status === 'pending'?'Your account was created and is awaiting institution verification.':'Welcome to AlumniConnect.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ message:'An account with this email already exists.' });
    throw error;
  } finally { client.release(); }
}));

app.post('/api/auth/login', asyncRoute(async (req,res) => {
  const email = text(req.body.email).toLowerCase();
  const result = await pool.query('SELECT id,name,email,password_hash,role,status FROM users WHERE LOWER(email)=$1',[email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || '',user.password_hash))) return res.status(401).json({ message:'Email or password is incorrect.' });
  if (user.status === 'suspended') return res.status(403).json({ message:'This account has been suspended. Contact your institution administrator.' });
  const safe = { id:user.id,name:user.name,email:user.email,role:user.role,status:user.status };
  res.json({ token:issueToken(safe), user:safe });
}));
app.get('/api/auth/me',auth,asyncRoute(async (req,res) => {
  const result = await pool.query('SELECT id,name,email,role,status FROM users WHERE id=$1',[req.user.id]);
  if (!result.rows[0] || result.rows[0].status === 'suspended') return res.status(401).json({ message:'Account is unavailable.' });
  res.json(result.rows[0]);
}));

app.get('/api/dashboard',auth,asyncRoute(async (req,res) => {
  const id = req.user.id, role = req.user.role;
  const count = async (sql,values=[]) => Number((await pool.query(sql,values)).rows[0].count);
  if (role === 'student') {
    const [mentorship,applications,events,opportunities,alumni] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM mentorship_requests WHERE student_id=$1',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM opportunity_applications WHERE student_id=$1',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=$1 AND e.starts_at>=NOW()',[id]),
      count("SELECT COUNT(*)::int AS count FROM opportunities WHERE is_active=TRUE AND (apply_by IS NULL OR apply_by>=CURRENT_DATE)"),
      count("SELECT COUNT(*)::int AS count FROM alumni_profiles p JOIN users u ON u.id=p.user_id WHERE p.is_verified=TRUE AND p.is_public=TRUE AND u.status='active'")
    ]);
    return res.json({ role,mentorshipRequests:mentorship.rows[0].count,applications:applications.rows[0].count,registeredEvents:events.rows[0].count,openOpportunities:opportunities,verifiedAlumni:alumni });
  }
  if (role === 'alumni') {
    const [requests,jobs,applicants,career,pledges] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM mentorship_requests WHERE alumni_id=$1 AND status='pending'",[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM opportunities WHERE COALESCE(created_by,alumni_id)=$1 AND is_active=TRUE',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE COALESCE(o.created_by,o.alumni_id)=$1',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM career_history WHERE alumni_id=$1',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM donation_pledges WHERE alumni_id=$1',[id])
    ]);
    return res.json({ role,pendingMentorship:requests.rows[0].count,postedOpportunities:jobs.rows[0].count,applicants:applicants.rows[0].count,careerEntries:career.rows[0].count,pledges:pledges.rows[0].count,verified:true });
  }
  if (role === 'recruiter') {
    const [jobs,applicants] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM opportunities WHERE created_by=$1 AND is_active=TRUE',[id]),
      pool.query('SELECT COUNT(*)::int AS count FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE o.created_by=$1',[id])
    ]);
    return res.json({ role,postedOpportunities:jobs.rows[0].count,applicants:applicants.rows[0].count });
  }
  const [users,alumni,pending,students,mentorship,opportunities,events,donations] = await Promise.all([
    count('SELECT COUNT(*)::int AS count FROM users'),
    count("SELECT COUNT(*)::int AS count FROM users WHERE role='alumni'"),
    count("SELECT COUNT(*)::int AS count FROM users WHERE status='pending'"),
    count("SELECT COUNT(*)::int AS count FROM users WHERE role='student'"),
    count('SELECT COUNT(*)::int AS count FROM mentorship_requests'),
    count('SELECT COUNT(*)::int AS count FROM opportunities'),
    count('SELECT COUNT(*)::int AS count FROM events'),
    pool.query("SELECT COALESCE(SUM(amount),0)::numeric AS total FROM donation_pledges WHERE status<>'withdrawn'")
  ]);
  res.json({ role,totalUsers:users,alumni,pendingApprovals:pending,students,mentorshipRequests:mentorship,opportunities,events,pledgedAmount:Number(donations.rows[0].total) });
}));

app.get('/api/alumni',auth,asyncRoute(async (req,res) => {
  const filters = { search:text(req.query.search),department:text(req.query.department),company:text(req.query.company),year:text(req.query.year) };
  const values = [];
  let where = 'WHERE p.is_public=TRUE';
  if (!['admin','faculty'].includes(req.user.role)) where += " AND p.is_verified=TRUE AND u.status='active'";
  if (filters.search) { values.push('%'+filters.search+'%'); const n=values.length; where += ' AND (u.name ILIKE $'+n+' OR p.company ILIKE $'+n+' OR p.job_title ILIKE $'+n+' OR p.department ILIKE $'+n+')'; }
  if (filters.department) { values.push(filters.department); where += ' AND p.department=$'+values.length; }
  if (filters.company) { values.push('%'+filters.company+'%'); where += ' AND p.company ILIKE $'+values.length; }
  if (filters.year && Number.isInteger(Number(filters.year))) { values.push(Number(filters.year)); where += ' AND p.graduation_year=$'+values.length; }
  const result = await pool.query(
    'SELECT u.id,u.name,p.graduation_year,p.department,p.degree,p.company,p.job_title,p.location,p.bio,p.skills,p.linkedin_url,p.is_verified FROM alumni_profiles p JOIN users u ON u.id=p.user_id '+where+' ORDER BY p.graduation_year DESC,u.name LIMIT 200',
    values
  );
  res.json(result.rows);
}));

app.get('/api/profile',auth,asyncRoute(async (req,res) => {
  const user = (await pool.query('SELECT id,name,email,role,status,created_at FROM users WHERE id=$1',[req.user.id])).rows[0];
  let extra = {};
  if (req.user.role==='alumni') extra = (await pool.query('SELECT * FROM alumni_profiles WHERE user_id=$1',[req.user.id])).rows[0] || {};
  if (req.user.role==='student') extra = (await pool.query('SELECT * FROM student_profiles WHERE user_id=$1',[req.user.id])).rows[0] || {};
  if (req.user.role==='faculty') extra = (await pool.query('SELECT * FROM faculty_profiles WHERE user_id=$1',[req.user.id])).rows[0] || {};
  if (req.user.role==='recruiter') extra = (await pool.query('SELECT * FROM recruiter_profiles WHERE user_id=$1',[req.user.id])).rows[0] || {};
  res.json({ ...extra, ...user, profile_id: extra.id ?? null, id: user.id });
}));
app.put('/api/profile',auth,active,asyncRoute(async (req,res) => {
  const name = req.body.name === undefined ? null : text(req.body.name);
  if (name) await pool.query('UPDATE users SET name=$1 WHERE id=$2',[name,req.user.id]);
  const update = async (table,fields) => {
    const current = (await pool.query('SELECT * FROM '+table+' WHERE user_id=$1',[req.user.id])).rows[0];
    if (!current) return;
    const values = fields.map(([key,normalizer]) => req.body[key] === undefined ? current[key] : normalizer(req.body[key]));
    await pool.query('UPDATE '+table+' SET '+fields.map(([key],i)=>key+'=$'+(i+1)).join(',')+',updated_at=NOW() WHERE user_id=$'+(fields.length+1),[...values,req.user.id]);
  };
  if (req.user.role==='alumni') {
    await update('alumni_profiles',[
      ['graduation_year',v=>Number(v)||2024],['department',text],['degree',text],['company',text],['job_title',text],['location',text],['bio',text],['skills',v=>Array.isArray(v)?v:[]],['linkedin_url',text],['is_public',v=>v!==false]
    ]);
  } else if (req.user.role==='student') {
    await update('student_profiles',[
      ['student_id',text],['department',text],['degree',text],['current_year',text],['graduation_year',v=>v?Number(v):null],['skills',v=>Array.isArray(v)?v:[]],['interests',v=>Array.isArray(v)?v:[]]
    ]);
  } else if (req.user.role==='recruiter') {
    await update('recruiter_profiles',[['company',text],['website',text],['designation',text]]);
  } else if (req.user.role==='faculty') {
    await update('faculty_profiles',[['department',text],['designation',text]]);
  }
  res.json({ message:'Profile updated successfully.' });
}));

app.get('/api/career-history',auth,roles('alumni'),asyncRoute(async (req,res) => {
  res.json((await pool.query('SELECT * FROM career_history WHERE alumni_id=$1 ORDER BY start_date DESC NULLS LAST,id DESC',[req.user.id])).rows);
}));
app.post('/api/career-history',auth,active,roles('alumni'),asyncRoute(async (req,res) => {
  const {company,job_title}=req.body;
  if (!text(company)||!text(job_title)) return res.status(400).json({message:'Company and job title are required.'});
  const result=await pool.query('INSERT INTO career_history (alumni_id,company,job_title,employment_type,location,start_date,end_date,is_current,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [req.user.id,text(company),text(job_title),text(req.body.employment_type),text(req.body.location),req.body.start_date||null,req.body.is_current?null:req.body.end_date||null,req.body.is_current===true,text(req.body.description)]);
  res.status(201).json(result.rows[0]);
}));
app.delete('/api/career-history/:id',auth,roles('alumni'),asyncRoute(async (req,res) => {
  const result=await pool.query('DELETE FROM career_history WHERE id=$1 AND alumni_id=$2 RETURNING id',[req.params.id,req.user.id]);
  if (!result.rows[0]) return res.status(404).json({message:'Career entry not found.'});
  res.json({message:'Career entry deleted.'});
}));

// Student asks for mentoring; the selected alumnus sees the exact request in their portal.
app.post('/api/mentorship',auth,active,roles('student'),asyncRoute(async (req,res) => {
  const alumniId=Number(req.body.alumni_id),topic=text(req.body.topic);
  if (!alumniId||!topic) return res.status(400).json({message:'Select an alumnus and enter a mentorship topic.'});
  const mentor=await pool.query("SELECT u.id FROM users u JOIN alumni_profiles p ON p.user_id=u.id WHERE u.id=$1 AND u.role='alumni' AND u.status='active' AND p.is_verified=TRUE AND p.is_public=TRUE",[alumniId]);
  if (!mentor.rows[0]) return res.status(404).json({message:'This alumnus is not available for mentorship.'});
  const result=await pool.query('INSERT INTO mentorship_requests (student_id,alumni_id,topic,message) VALUES ($1,$2,$3,$4) RETURNING *',[req.user.id,alumniId,topic,text(req.body.message)]);
  await notify(alumniId,'New mentorship request',req.user.name+' requested guidance about '+topic+'.');
  res.status(201).json(result.rows[0]);
}));
app.get('/api/mentorship',auth,asyncRoute(async (req,res) => {
  let where='WHERE m.student_id=$1',values=[req.user.id];
  if (req.user.role==='alumni') where='WHERE m.alumni_id=$1';
  else if (['admin','faculty'].includes(req.user.role)) { where='WHERE TRUE'; values=[]; }
  const result=await pool.query('SELECT m.*,s.name AS student_name,s.email AS student_email,a.name AS alumni_name FROM mentorship_requests m JOIN users s ON s.id=m.student_id JOIN users a ON a.id=m.alumni_id '+where+' ORDER BY m.created_at DESC LIMIT 200',values);
  res.json(result.rows);
}));
app.patch('/api/mentorship/:id',auth,active,roles('alumni'),asyncRoute(async (req,res) => {
  const status=req.body.status;
  if (!['accepted','declined','completed'].includes(status)) return res.status(400).json({message:'Invalid mentorship status.'});
  const result=await pool.query("UPDATE mentorship_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND alumni_id=$3 AND status IN ('pending','accepted') RETURNING *",[status,req.params.id,req.user.id]);
  if (!result.rows[0]) return res.status(404).json({message:'Mentorship request not found or already closed.'});
  await notify(result.rows[0].student_id,'Mentorship update','Your request was '+status+'.');
  res.json(result.rows[0]);
}));

app.get('/api/opportunities',auth,asyncRoute(async (req,res) => {
  const result=await pool.query(
    "SELECT o.*,u.name AS posted_by,u.role AS poster_role FROM opportunities o LEFT JOIN users u ON u.id=COALESCE(o.created_by,o.alumni_id) WHERE (o.is_active=TRUE OR $1 IN ('admin','faculty')) AND (o.apply_by IS NULL OR o.apply_by>=CURRENT_DATE OR $1 IN ('admin','faculty')) ORDER BY o.created_at DESC LIMIT 200",
    [req.user.role]
  );
  res.json(result.rows);
}));
app.post('/api/opportunities',auth,active,roles('alumni','recruiter','admin'),asyncRoute(async (req,res) => {
  const title=text(req.body.title),company=text(req.body.company),description=text(req.body.description);
  const type=['internship','job','project'].includes(req.body.type)?req.body.type:'internship';
  if (!title||!company||!description) return res.status(400).json({message:'Title, company and description are required.'});
  const result=await pool.query('INSERT INTO opportunities (alumni_id,created_by,title,company,description,type,location,apply_by,application_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [req.user.role==='alumni'?req.user.id:null,req.user.id,title,company,description,type,text(req.body.location)||'Remote',req.body.apply_by||null,text(req.body.application_url)]);
  const recipients=await pool.query("SELECT id FROM users WHERE role='student' AND status='active'");
  for (const row of recipients.rows) await notify(row.id,'New opportunity',title+' at '+company+' has been posted.');
  res.status(201).json(result.rows[0]);
}));
app.post('/api/opportunities/:id/apply',auth,active,roles('student'),asyncRoute(async (req,res) => {
  const opportunity=await pool.query('SELECT id,created_by,alumni_id,title FROM opportunities WHERE id=$1 AND is_active=TRUE AND (apply_by IS NULL OR apply_by>=CURRENT_DATE)',[req.params.id]);
  if (!opportunity.rows[0]) return res.status(404).json({message:'Opportunity is unavailable or its deadline has passed.'});
  const result=await pool.query('INSERT INTO opportunity_applications (opportunity_id,student_id,note,resume_url) VALUES ($1,$2,$3,$4) RETURNING *',[req.params.id,req.user.id,text(req.body.note),text(req.body.resume_url)]);
  const owner=opportunity.rows[0].created_by||opportunity.rows[0].alumni_id;
  if (owner) await notify(owner,'New opportunity application',req.user.name+' applied for '+opportunity.rows[0].title+'.');
  res.status(201).json(result.rows[0]);
}));
app.get('/api/my-applications',auth,roles('student'),asyncRoute(async (req,res) => {
  res.json((await pool.query('SELECT a.*,o.title,o.company,o.location,o.apply_by FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE a.student_id=$1 ORDER BY a.created_at DESC',[req.user.id])).rows);
}));
app.get('/api/managed-applications',auth,roles('alumni','recruiter','admin'),asyncRoute(async (req,res) => {
  let where='TRUE',values=[];
  if (req.user.role!=='admin') { where='COALESCE(o.created_by,o.alumni_id)=$1'; values=[req.user.id]; }
  const result=await pool.query('SELECT a.id,a.status,a.note,a.resume_url,a.created_at,u.name AS student_name,u.email AS student_email,p.department,p.degree,p.current_year,o.title AS opportunity_title,o.company FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id JOIN users u ON u.id=a.student_id LEFT JOIN student_profiles p ON p.user_id=u.id WHERE '+where+' ORDER BY a.created_at DESC LIMIT 300',values);
  res.json(result.rows);
}));
app.patch('/api/applications/:id/status',auth,active,roles('alumni','recruiter','admin'),asyncRoute(async (req,res) => {
  if (!['reviewing','shortlisted','rejected','hired'].includes(req.body.status)) return res.status(400).json({message:'Invalid application status.'});
  const result=await pool.query('UPDATE opportunity_applications a SET status=$1,updated_at=NOW() FROM opportunities o WHERE a.id=$2 AND o.id=a.opportunity_id AND ($4=\'admin\' OR COALESCE(o.created_by,o.alumni_id)=$3) RETURNING a.*',[req.body.status,req.params.id,req.user.id,req.user.role]);
  if (!result.rows[0]) return res.status(404).json({message:'Application not found or not managed by your account.'});
  await notify(result.rows[0].student_id,'Application status updated','Your application status is now '+req.body.status+'.');
  res.json(result.rows[0]);
}));

app.get('/api/events',auth,asyncRoute(async (req,res) => {
  const result=await pool.query('SELECT e.*,u.name AS created_by_name,(SELECT COUNT(*)::int FROM event_registrations r WHERE r.event_id=e.id) AS attendee_count,EXISTS(SELECT 1 FROM event_registrations r WHERE r.event_id=e.id AND r.user_id=$1) AS registered FROM events e JOIN users u ON u.id=e.created_by ORDER BY e.starts_at LIMIT 200',[req.user.id]);
  res.json(result.rows);
}));
app.post('/api/events',auth,active,roles('admin','faculty','alumni'),asyncRoute(async (req,res) => {
  const title=text(req.body.title),starts=req.body.starts_at;
  if (!title||!starts||Number.isNaN(Date.parse(starts))||Date.parse(starts)<=Date.now()) return res.status(400).json({message:'Enter an event title and a future date.'});
  const result=await pool.query('INSERT INTO events (created_by,title,description,venue,starts_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',[req.user.id,title,text(req.body.description),text(req.body.venue)||'Campus',new Date(starts).toISOString()]);
  const recipients=await pool.query("SELECT id FROM users WHERE id<>$1 AND status='active'",[req.user.id]);
  for (const row of recipients.rows) await notify(row.id,'New community event',title+' has been scheduled.');
  res.status(201).json(result.rows[0]);
}));
app.post('/api/events/:id/register',auth,active,roles('student','alumni','faculty'),asyncRoute(async (req,res) => {
  const event=await pool.query('SELECT id,title,created_by FROM events WHERE id=$1 AND starts_at>NOW()',[req.params.id]);
  if (!event.rows[0]) return res.status(404).json({message:'Event not found or registration has closed.'});
  const result=await pool.query('INSERT INTO event_registrations (event_id,user_id) VALUES ($1,$2) RETURNING *',[req.params.id,req.user.id]);
  if (Number(event.rows[0].created_by)!==Number(req.user.id)) await notify(event.rows[0].created_by,'New event registration',req.user.name+' registered for '+event.rows[0].title+'.');
  res.status(201).json(result.rows[0]);
}));

app.post('/api/donation-pledges',auth,active,roles('alumni'),asyncRoute(async (req,res) => {
  const amount=Number(req.body.amount),purpose=text(req.body.purpose);
  if (!(amount>0)||!purpose) return res.status(400).json({message:'Enter a positive amount and a purpose.'});
  const result=await pool.query('INSERT INTO donation_pledges (alumni_id,amount,purpose,note) VALUES ($1,$2,$3,$4) RETURNING *',[req.user.id,amount,purpose,text(req.body.note)]);
  await notifyAdmins('New donation pledge interest','An alumnus recorded a pledge interest of ₹'+amount+'.');
  res.status(201).json(result.rows[0]);
}));
app.get('/api/donation-pledges',auth,roles('admin'),asyncRoute(async (_req,res) => {
  res.json((await pool.query('SELECT d.*,u.name AS alumni_name,u.email FROM donation_pledges d JOIN users u ON u.id=d.alumni_id ORDER BY d.created_at DESC')).rows);
}));
app.patch('/api/donation-pledges/:id',auth,active,roles('admin'),asyncRoute(async (req,res) => {
  if (!['contacted','fulfilled','withdrawn','interested'].includes(req.body.status)) return res.status(400).json({message:'Invalid pledge status.'});
  const result=await pool.query('UPDATE donation_pledges SET status=$1 WHERE id=$2 RETURNING *',[req.body.status,req.params.id]);
  if (!result.rows[0]) return res.status(404).json({message:'Pledge not found.'});
  res.json(result.rows[0]);
}));

app.get('/api/notifications',auth,asyncRoute(async (req,res) => {
  res.json((await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id])).rows);
}));
app.patch('/api/notifications/:id/read',auth,asyncRoute(async (req,res) => {
  const result=await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *',[req.params.id,req.user.id]);
  if (!result.rows[0]) return res.status(404).json({message:'Notification not found.'});
  res.json(result.rows[0]);
}));

app.get('/api/announcements',auth,asyncRoute(async (req,res) => {
  const audience = req.user.role==='student'?'students':req.user.role==='alumni'?'alumni':req.user.role==='faculty'?'faculty':req.user.role==='recruiter'?'recruiters':'all';
  const result = req.user.role === 'admin'
    ? await pool.query('SELECT a.*,u.name AS author FROM announcements a JOIN users u ON u.id=a.created_by ORDER BY a.created_at DESC LIMIT 50')
    : await pool.query("SELECT a.*,u.name AS author FROM announcements a JOIN users u ON u.id=a.created_by WHERE a.audience='all' OR a.audience=$1 ORDER BY a.created_at DESC LIMIT 50",[audience]);
  res.json(result.rows);
}));
app.post('/api/announcements',auth,active,roles('admin','faculty'),asyncRoute(async (req,res) => {
  const title=text(req.body.title),body=text(req.body.body),audience=['all','students','alumni','faculty','recruiters'].includes(req.body.audience)?req.body.audience:'all';
  if (!title||!body) return res.status(400).json({message:'Announcement title and message are required.'});
  const result=await pool.query('INSERT INTO announcements (created_by,title,body,audience) VALUES ($1,$2,$3,$4) RETURNING *',[req.user.id,title,body,audience]);
  const targetRole=audience==='all'?null:audience==='students'?'student':audience==='alumni'?'alumni':audience==='recruiters'?'recruiter':'faculty';
  const recipients=await pool.query("SELECT id FROM users WHERE id<>$1 AND status='active' AND ($2::text IS NULL OR role=$2)",[req.user.id,targetRole]);
  for (const row of recipients.rows) await notify(row.id,'Institution announcement',title);
  res.status(201).json(result.rows[0]);
}));

// Admin-only institution management.
app.get('/api/admin/users',auth,roles('admin'),asyncRoute(async (_req,res) => {
  const result=await pool.query("SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,p.graduation_year,p.department,p.company,p.is_verified FROM users u LEFT JOIN alumni_profiles p ON p.user_id=u.id ORDER BY CASE WHEN u.status='pending' THEN 0 ELSE 1 END,u.created_at DESC LIMIT 500");
  res.json(result.rows);
}));
app.patch('/api/admin/users/:id/status',auth,active,roles('admin'),asyncRoute(async (req,res) => {
  const status=req.body.status;
  if (!['active','suspended'].includes(status)) return res.status(400).json({message:'Status must be active or suspended.'});
  const result=await pool.query("UPDATE users SET status=$1 WHERE id=$2 AND role<>'admin' RETURNING id,name,email,role,status",[status,req.params.id]);
  if (!result.rows[0]) return res.status(404).json({message:'User not found or cannot be changed.'});
  res.json(result.rows[0]);
}));
app.patch('/api/admin/users/:id/verification',auth,active,roles('admin'),asyncRoute(async (req,res) => {
  const decision=req.body.decision;
  if (!['approve','reject'].includes(decision)) return res.status(400).json({message:'Decision must be approve or reject.'});
  const user=(await pool.query('SELECT id,role FROM users WHERE id=$1',[req.params.id])).rows[0];
  if (!user||!['alumni','recruiter'].includes(user.role)) return res.status(404).json({message:'Pending alumni or recruiter account not found.'});
  if (user.role==='alumni') await pool.query('UPDATE alumni_profiles SET is_verified=$1,verification_notes=$2 WHERE user_id=$3',[decision==='approve',text(req.body.notes),user.id]);
  await pool.query('UPDATE users SET status=$1 WHERE id=$2',[decision==='approve'?'active':'suspended',user.id]);
  await notify(user.id,'Account verification update',decision==='approve'?'Your account has been approved.':'Your account was not approved. Please contact the institution.');
  res.json({message:'Account '+(decision==='approve'?'approved':'rejected')+' successfully.'});
}));
app.get('/api/admin/reports',auth,roles('admin','faculty'),asyncRoute(async (_req,res) => {
  const [users,mentorship,opps,events,pledges,career]=await Promise.all([
    pool.query('SELECT role,COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role'),
    pool.query('SELECT status,COUNT(*)::int AS count FROM mentorship_requests GROUP BY status'),
    pool.query('SELECT type,COUNT(*)::int AS count FROM opportunities GROUP BY type'),
    pool.query('SELECT COUNT(*)::int AS registrations FROM event_registrations'),
    pool.query('SELECT status,COUNT(*)::int AS count,COALESCE(SUM(amount),0)::numeric AS amount FROM donation_pledges GROUP BY status'),
    pool.query('SELECT COUNT(*)::int AS count FROM career_history')
  ]);
  res.json({usersByRole:users.rows,mentorshipByStatus:mentorship.rows,opportunitiesByType:opps.rows,eventRegistrations:events.rows[0].registrations,pledgesByStatus:pledges.rows,careerEntries:career.rows[0].count});
}));
app.get('/api/admin/alumni.csv',auth,roles('admin'),asyncRoute(async (_req,res) => {
  const rows=(await pool.query('SELECT u.name,u.email,p.graduation_year,p.department,p.degree,p.company,p.job_title,p.location,p.is_verified FROM users u JOIN alumni_profiles p ON p.user_id=u.id ORDER BY p.graduation_year DESC,u.name')).rows;
  const headers=['Name','Email','Graduation Year','Department','Degree','Company','Job Title','Location','Verified'];
  const csv=[headers.map(safeCsv).join(','),...rows.map(row=>Object.values(row).map(safeCsv).join(','))].join('\r\n');
  res.type('text/csv').attachment('alumni-directory.csv').send(csv);
}));

app.use('/api',(_req,res)=>res.status(404).json({message:'API route not found.'}));
app.use((error,_req,res,_next)=>{
  console.error(error);
  if (error.code==='23505') return res.status(409).json({message:'This record already exists.'});
  if (error.code==='23503') return res.status(400).json({message:'A related record was not found.'});
  if (['23514','22P02','22007'].includes(error.code)) return res.status(400).json({message:'Some submitted values are invalid.'});
  res.status(500).json({message:'Something went wrong. Please try again.'});
});

const builtClient=path.join(root,'client','dist');
if (fs.existsSync(builtClient)) {
  app.use(express.static(builtClient));
  app.get('*',(_req,res)=>res.sendFile(path.join(builtClient,'index.html')));
}
const port=Number(process.env.PORT)||4000;
app.listen(port,()=>console.log('AlumniConnect web app listening on port '+port));

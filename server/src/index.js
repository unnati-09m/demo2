import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { authenticate, allowRoles } from './auth.js';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const notify = async (userId, title, body) => {
  await pool.query(
    'INSERT INTO notifications (user_id, title, body) VALUES ($1, $2, $3)',
    [userId, title, body]
  );
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AlumniConnect API' }));

// Authentication
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ message: 'Enter your name, email and a password of at least 8 characters.' });
  }
  if (!['student', 'alumni'].includes(role)) {
    return res.status(400).json({ message: 'Choose a valid account type.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name.trim(), email.toLowerCase().trim(), passwordHash, role]
  );
  const user = result.rows[0];

  if (role === 'alumni') {
    await pool.query(
      'INSERT INTO alumni_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user.id]
    );
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2d' }
  );
  res.status(201).json({ token, user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email?.toLowerCase().trim()]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2d' }
  );
  res.json({ token, user: safeUser });
}));

app.get('/api/me', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Account not found.' });
  res.json(result.rows[0]);
}));

// Dashboard and alumni directory
app.get('/api/dashboard', authenticate, asyncRoute(async (req, res) => {
  const [alumni, students, opportunities, events, pledges] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'alumni'"),
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'"),
    pool.query('SELECT COUNT(*)::int AS count FROM opportunities'),
    pool.query('SELECT COUNT(*)::int AS count FROM events WHERE starts_at >= NOW()'),
    pool.query('SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM donation_pledges WHERE status <> \'withdrawn\'')
  ]);
  res.json({
    alumni: alumni.rows[0].count,
    students: students.rows[0].count,
    opportunities: opportunities.rows[0].count,
    upcomingEvents: events.rows[0].count,
    pledgedAmount: Number(pledges.rows[0].total)
  });
}));

app.get('/api/alumni', authenticate, asyncRoute(async (req, res) => {
  const { search = '', department = '', year = '' } = req.query;
  const values = [];
  let where = 'WHERE p.is_public = TRUE';
  if (search) {
    values.push('%' + search + '%');
    where += ' AND (u.name ILIKE $' + values.length +
      ' OR p.company ILIKE $' + values.length +
      ' OR p.job_title ILIKE $' + values.length + ')';
  }
  if (department) {
    values.push(department);
    where += ' AND p.department = $' + values.length;
  }
  if (year) {
    values.push(Number(year));
    where += ' AND p.graduation_year = $' + values.length;
  }

  const result = await pool.query(
    `SELECT u.id, u.name, p.graduation_year, p.department, p.degree,
      p.company, p.job_title, p.location, p.bio, p.skills, p.linkedin_url
     FROM alumni_profiles p
     JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.graduation_year DESC, u.name
     LIMIT 100`,
    values
  );
  res.json(result.rows);
}));

app.get('/api/profile', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, p.graduation_year,
      p.department, p.degree, p.company, p.job_title, p.location,
      p.bio, p.skills, p.linkedin_url, p.is_public
     FROM users u LEFT JOIN alumni_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0]);
}));

app.put('/api/profile', authenticate, asyncRoute(async (req, res) => {
  const {
    name, graduation_year, department, degree, company,
    job_title, location, bio, skills, linkedin_url, is_public
  } = req.body;

  if (name?.trim()) {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.user.id]);
  }

  if (req.user.role === 'alumni') {
    await pool.query(
      `INSERT INTO alumni_profiles
        (user_id, graduation_year, department, degree, company, job_title,
         location, bio, skills, linkedin_url, is_public, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         graduation_year = EXCLUDED.graduation_year,
         department = EXCLUDED.department,
         degree = EXCLUDED.degree,
         company = EXCLUDED.company,
         job_title = EXCLUDED.job_title,
         location = EXCLUDED.location,
         bio = EXCLUDED.bio,
         skills = EXCLUDED.skills,
         linkedin_url = EXCLUDED.linkedin_url,
         is_public = EXCLUDED.is_public,
         updated_at = NOW()`,
      [
        req.user.id, Number(graduation_year) || new Date().getFullYear(),
        department || 'Not specified', degree || '', company || '',
        job_title || '', location || '', bio || '',
        Array.isArray(skills) ? skills : [], linkedin_url || '', is_public !== false
      ]
    );
  }
  res.json({ message: 'Profile updated.' });
}));

// Mentorship
app.post('/api/mentorship', authenticate, allowRoles('student'), asyncRoute(async (req, res) => {
  const { alumni_id, topic, message = '' } = req.body;
  if (!alumni_id || !topic?.trim()) {
    return res.status(400).json({ message: 'Select an alumnus and enter a mentorship topic.' });
  }
  const result = await pool.query(
    'INSERT INTO mentorship_requests (student_id, alumni_id, topic, message) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, alumni_id, topic.trim(), message]
  );
  await notify(Number(alumni_id), 'New mentorship request', 'A student requested guidance about: ' + topic.trim());
  res.status(201).json(result.rows[0]);
}));

app.get('/api/mentorship', authenticate, asyncRoute(async (req, res) => {
  const column = req.user.role === 'alumni' ? 'm.alumni_id' : 'm.student_id';
  const result = await pool.query(
    `SELECT m.*, s.name AS student_name, a.name AS alumni_name
     FROM mentorship_requests m
     JOIN users s ON s.id = m.student_id
     JOIN users a ON a.id = m.alumni_id
     WHERE ${column} = $1
     ORDER BY m.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
}));

app.patch('/api/mentorship/:id', authenticate, allowRoles('alumni'), asyncRoute(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid request status.' });
  }
  const result = await pool.query(
    'UPDATE mentorship_requests SET status = $1 WHERE id = $2 AND alumni_id = $3 RETURNING *',
    [status, req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Mentorship request not found.' });
  await notify(result.rows[0].student_id, 'Mentorship request updated', 'Your request was ' + status + '.');
  res.json(result.rows[0]);
}));

// Career opportunities and applications
app.get('/api/opportunities', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, u.name AS posted_by
     FROM opportunities o JOIN users u ON u.id = o.alumni_id
     ORDER BY o.created_at DESC`
  );
  res.json(result.rows);
}));

app.post('/api/opportunities', authenticate, allowRoles('alumni', 'admin'), asyncRoute(async (req, res) => {
  const {
    title, company, description, type = 'internship',
    location = 'Remote', apply_by = null, application_url = ''
  } = req.body;
  if (!title?.trim() || !company?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Title, company and description are required.' });
  }
  const result = await pool.query(
    `INSERT INTO opportunities
      (alumni_id, title, company, description, type, location, apply_by, application_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.user.id, title.trim(), company.trim(), description.trim(), type, location, apply_by || null, application_url]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, title, body)
     SELECT id, 'New career opportunity', $1
     FROM users WHERE role = 'student' AND id <> $2`,
    [title.trim() + ' at ' + company.trim(), req.user.id]
  );
  res.status(201).json(result.rows[0]);
}));

app.post('/api/opportunities/:id/apply', authenticate, allowRoles('student'), asyncRoute(async (req, res) => {
  const opportunity = await pool.query(
    'SELECT id, alumni_id, title FROM opportunities WHERE id = $1',
    [req.params.id]
  );
  if (!opportunity.rows[0]) return res.status(404).json({ message: 'Opportunity not found.' });

  const result = await pool.query(
    'INSERT INTO opportunity_applications (opportunity_id, student_id, note) VALUES ($1, $2, $3) RETURNING *',
    [req.params.id, req.user.id, req.body.note || '']
  );
  await notify(
    opportunity.rows[0].alumni_id,
    'New opportunity application',
    req.user.name + ' applied for ' + opportunity.rows[0].title + '.'
  );
  res.status(201).json(result.rows[0]);
}));

app.get('/api/my-applications', authenticate, allowRoles('student'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, o.title, o.company, o.location
     FROM opportunity_applications a
     JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.student_id = $1
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
}));

// Events and registrations
app.get('/api/events', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT e.*, u.name AS created_by_name,
      (SELECT COUNT(*)::int FROM event_registrations r WHERE r.event_id = e.id) AS attendee_count,
      EXISTS(SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = $1) AS registered
     FROM events e JOIN users u ON u.id = e.created_by
     ORDER BY e.starts_at`,
    [req.user.id]
  );
  res.json(result.rows);
}));

app.post('/api/events', authenticate, allowRoles('admin', 'alumni'), asyncRoute(async (req, res) => {
  const { title, description = '', venue = 'Campus', starts_at } = req.body;
  if (!title?.trim() || !starts_at) {
    return res.status(400).json({ message: 'Enter an event title and date.' });
  }
  const result = await pool.query(
    'INSERT INTO events (created_by, title, description, venue, starts_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user.id, title.trim(), description, venue, starts_at]
  );
  await pool.query(
    `INSERT INTO notifications (user_id, title, body)
     SELECT id, 'New community event', $1 FROM users WHERE id <> $2`,
    [title.trim() + ' · ' + venue, req.user.id]
  );
  res.status(201).json(result.rows[0]);
}));

app.post('/api/events/:id/register', authenticate, asyncRoute(async (req, res) => {
  const event = await pool.query(
    'SELECT id, created_by, title FROM events WHERE id = $1',
    [req.params.id]
  );
  if (!event.rows[0]) return res.status(404).json({ message: 'Event not found.' });

  const result = await pool.query(
    'INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2) RETURNING *',
    [req.params.id, req.user.id]
  );
  if (Number(event.rows[0].created_by) !== Number(req.user.id)) {
    await notify(
      event.rows[0].created_by,
      'New event registration',
      req.user.name + ' registered for ' + event.rows[0].title + '.'
    );
  }
  res.status(201).json(result.rows[0]);
}));

// Donation-interest records (this prototype does not collect money).
app.post('/api/donation-pledges', authenticate, allowRoles('alumni'), asyncRoute(async (req, res) => {
  const { amount, purpose, note = '' } = req.body;
  if (!(Number(amount) > 0) || !purpose?.trim()) {
    return res.status(400).json({ message: 'Enter a positive amount and a purpose.' });
  }
  const result = await pool.query(
    'INSERT INTO donation_pledges (alumni_id, amount, purpose, note) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, amount, purpose.trim(), note]
  );
  res.status(201).json(result.rows[0]);
}));

// Notifications and administrator reports
app.get('/api/notifications', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json(result.rows);
}));

app.patch('/api/notifications/:id/read', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Notification not found.' });
  res.json(result.rows[0]);
}));

app.get('/api/admin/summary', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const [users, mentorship, opportunities, events, pledges] = await Promise.all([
    pool.query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role'),
    pool.query('SELECT status, COUNT(*)::int AS count FROM mentorship_requests GROUP BY status'),
    pool.query('SELECT type, COUNT(*)::int AS count FROM opportunities GROUP BY type'),
    pool.query('SELECT COUNT(*)::int AS count FROM event_registrations'),
    pool.query('SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS amount FROM donation_pledges GROUP BY status')
  ]);
  res.json({
    usersByRole: users.rows,
    mentorshipByStatus: mentorship.rows,
    opportunitiesByType: opportunities.rows,
    eventRegistrations: events.rows[0].count,
    pledgesByStatus: pledges.rows
  });
}));

app.get('/api/admin/alumni.csv', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT u.name, u.email, p.graduation_year, p.department, p.company,
      p.job_title, p.location
     FROM users u JOIN alumni_profiles p ON p.user_id = u.id
     ORDER BY p.graduation_year DESC, u.name`
  );
  const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const csv = [
    'Name,Email,Graduation Year,Department,Company,Job Title,Location',
    ...result.rows.map((row) => Object.values(row).map(quote).join(','))
  ].join('\n');
  res.type('text/csv').attachment('alumni-report.csv').send(csv);
}));

app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === '23505') return res.status(409).json({ message: 'This record already exists.' });
  if (error.code === '23503') return res.status(400).json({ message: 'A related record was not found.' });
  if (error.code === '23514' || error.code === '22P02') return res.status(400).json({ message: 'Some submitted values are invalid.' });
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log('AlumniConnect API running on http://localhost:' + port));

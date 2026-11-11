import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const passwordHash = await bcrypt.hash('Demo@123', 10);

try {
  const accounts = [
    ['admin', 'Demo Admin', 'admin@alumniconnect.test', 'admin'],
    ['alumni', 'Aarav Alumni', 'alumni@alumniconnect.test', 'alumni'],
    ['alumni2', 'Sana Mehta', 'sana@alumniconnect.test', 'alumni'],
    ['alumni3', 'Kabir Shah', 'kabir@alumniconnect.test', 'alumni'],
    ['alumni4', 'Riya Deshmukh', 'riya@alumniconnect.test', 'alumni'],
    ['student', 'Student Demo', 'student@alumniconnect.test', 'student']
  ];

  const ids = {};
  for (const [key, name, email, role] of accounts) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, email, passwordHash, role]
    );
    ids[key] = result.rows[0].id;
  }

  // Fictional alumni records make the directory useful for a first demo.
  const profiles = [
    {
      id: ids.alumni, year: 2022, department: 'Computer Science', degree: 'B.Tech',
      company: 'Example Technologies', title: 'Software Engineer', location: 'Pune',
      bio: 'Happy to guide students and share career experience.',
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL']
    },
    {
      id: ids.alumni2, year: 2021, department: 'Information Technology', degree: 'B.Tech',
      company: 'Northstar Labs', title: 'Product Analyst', location: 'Mumbai',
      bio: 'Interested in product thinking, analytics and mentoring.',
      skills: ['SQL', 'Product Analytics', 'Excel']
    },
    {
      id: ids.alumni3, year: 2020, department: 'Electronics', degree: 'B.E.',
      company: 'Bright Circuits', title: 'Systems Engineer', location: 'Bengaluru',
      bio: 'Enjoys helping students explore engineering careers.',
      skills: ['Embedded Systems', 'Python', 'Testing']
    },
    {
      id: ids.alumni4, year: 2023, department: 'Computer Science', degree: 'B.Tech',
      company: 'Cloud Nine', title: 'Frontend Developer', location: 'Remote',
      bio: 'Frontend developer interested in accessible user experiences.',
      skills: ['React', 'CSS', 'Accessibility']
    }
  ];

  for (const profile of profiles) {
    await pool.query(
      `INSERT INTO alumni_profiles
        (user_id, graduation_year, department, degree, company, job_title, location, bio, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        profile.id, profile.year, profile.department, profile.degree,
        profile.company, profile.title, profile.location, profile.bio, profile.skills
      ]
    );
  }

  await pool.query(
    `INSERT INTO opportunities (alumni_id, title, company, description, type, location, apply_by)
     SELECT $1, 'Frontend Developer Intern', 'Example Labs',
      'Work with a small product team on React interfaces.', 'internship', 'Remote',
      CURRENT_DATE + INTERVAL '20 days'
     WHERE NOT EXISTS (
       SELECT 1 FROM opportunities WHERE alumni_id = $1 AND title = 'Frontend Developer Intern'
     )`,
    [ids.alumni]
  );

  await pool.query(
    `INSERT INTO opportunities (alumni_id, title, company, description, type, location, apply_by)
     SELECT $1, 'Product Analyst Intern', 'Northstar Labs',
      'Support research, dashboards and product analysis.', 'internship', 'Mumbai',
      CURRENT_DATE + INTERVAL '25 days'
     WHERE NOT EXISTS (
       SELECT 1 FROM opportunities WHERE alumni_id = $1 AND title = 'Product Analyst Intern'
     )`,
    [ids.alumni2]
  );

  await pool.query(
    `INSERT INTO events (created_by, title, description, venue, starts_at)
     SELECT $1, 'Alumni Connect Meetup',
      'Meet alumni, ask questions and build professional connections.',
      'Main Auditorium', NOW() + INTERVAL '14 days'
     WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Alumni Connect Meetup')`,
    [ids.admin]
  );

  console.log('Demo data inserted. Password for all demo users: Demo@123');
} finally {
  await pool.end();
}

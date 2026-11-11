import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const passwordHash = await bcrypt.hash('Demo@123', 10);

try {
  const accounts = [
    ['Demo Admin', 'admin@alumniconnect.test', 'admin'],
    ['Aarav Alumni', 'alumni@alumniconnect.test', 'alumni'],
    ['Student Demo', 'student@alumniconnect.test', 'student']
  ];

  const ids = {};
  for (const [name, email, role] of accounts) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, email, passwordHash, role]
    );
    ids[role] = result.rows[0].id;
  }

  await pool.query(
    `INSERT INTO alumni_profiles
      (user_id, graduation_year, department, degree, company, job_title, location, bio, skills)
     VALUES ($1, 2022, 'Computer Science', 'B.Tech', 'Example Technologies',
      'Software Engineer', 'Pune', 'Happy to guide students and share career experience.',
      ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL'])
     ON CONFLICT (user_id) DO NOTHING`,
    [ids.alumni]
  );

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

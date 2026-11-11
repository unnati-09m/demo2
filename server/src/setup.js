import 'dotenv/config';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env first.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const schemaFile = fileURLToPath(new URL('./schema.sql', import.meta.url));
  const sql = await fs.readFile(schemaFile, 'utf8');
  await pool.query(sql);
  console.log('Database tables and indexes are ready.');
} finally {
  await pool.end();
}

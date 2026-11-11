# AlumniConnect — Alumni Management & Engagement Platform

A beginner-friendly full-stack academic prototype for the alumni-management problem statement. It brings alumni profiles, networking, mentorship, career opportunities, events and donation-interest records into one place.

## Features

- Role-based accounts: **student**, **alumni** and **admin**
- Alumni profiles with graduation year, department, degree, company, job title, location, biography, skills and LinkedIn URL
- Searchable alumni directory
- Student-to-alumni mentorship requests with accept/decline workflow
- In-app notifications for mentorship updates
- Alumni-posted internships, jobs and project opportunities
- Student opportunity applications
- Community events and event registration
- Donation pledge/interest records (no payment gateway or money transfer)
- Admin summary reports and alumni CSV export

## Technology

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL using the `pg` library
- Authentication: JWT + bcrypt
- Styling: plain CSS

## Run locally

Requirements: Node.js 20+ and PostgreSQL.

### 1. Create a database

Create a PostgreSQL database named `alumniconnect` (or choose another name and use it in the connection string).

### 2. Configure the backend

Copy `server/.env.example` to `server/.env` and update the database URL and JWT secret.

Example:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/alumniconnect
JWT_SECRET=use-a-long-random-secret-here
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Install and set up the API

```bash
cd server
npm install
npm run db:setup
npm run seed
npm run dev
```

The API runs at `http://localhost:4000`. Check `http://localhost:4000/api/health`.

### 4. Install and run the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The client uses `http://localhost:4000/api` by default. To change it, copy `client/.env.example` to `client/.env` and update `VITE_API_URL`.

## Demo accounts

After running the seed script, use password `Demo@123` for these fictional demo accounts:

| Role | Email |
|---|---|
| Admin | `admin@alumniconnect.test` |
| Alumni | `alumni@alumniconnect.test` |
| Student | `student@alumniconnect.test` |

New public registrations can create student or alumni accounts. Admin accounts are intentionally created by the seed process rather than public registration.

## Project documents

- `docs/requirements.md`: problem, scope, stakeholders, functional requirements and data relationships
- `docs/subject-mapping.md`: ISD, ASD, DBMS and DE mapping
- `docs/test-checklist.md`: manual test plan

## Important scope notes

This is an academic prototype, not a production alumni system. Demo data is fictional. Notifications are in-app only; no email/SMS provider is connected. Donation pledges record an expression of interest and do not collect or transfer money. There is no institutional SSO or automated identity verification. The CSV export is a simple data-extraction/reporting feature, not a scheduled production ETL pipeline.

Before any public deployment, replace the demo credentials and JWT secret, configure secure HTTPS hosting, and review privacy, consent and data-retention requirements for real alumni information.

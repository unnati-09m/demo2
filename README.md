# AlumniConnect — Alumni Management & Engagement Platform

AlumniConnect is a centralized web platform that helps an educational institution maintain long-term relationships with graduates and create structured ways for alumni, current students, faculty, administrators and recruiters to engage.

## Problem being addressed

After graduation, alumni contact details, academic records and career updates can become scattered or outdated. Informal messaging groups and mailing lists do not provide a reliable institutional record or structured workflows for mentorship, internships, events and fundraising.

AlumniConnect provides a shared alumni directory, verified profiles, career-history tracking, mentorship workflows, opportunities, event management, institutional announcements and donation pledge tracking.

## Roles and workflows

- **Student:** registers with academic details, discovers verified alumni, requests mentorship, applies for internships/jobs/projects, tracks applications, registers for events and receives notifications.
- **Alumni:** registers for institutional verification, maintains an alumni and career profile, manages career history, responds to mentorship requests, posts opportunities, reviews applicants, creates events and records pledge interest.
- **Faculty:** supports engagement, views alumni and mentorship activity, creates events, publishes announcements and reviews reports.
- **Administrator:** approves or rejects alumni/recruiter accounts, manages account access, views institution-wide reports, tracks pledge interest and exports the alumni directory.
- **Recruiter / Employer:** registers for verification, publishes opportunities and reviews applicants.

Public registration never grants administrator or faculty privileges. New alumni and recruiter accounts remain pending until approved by an institution administrator.

## Technology

- Frontend: React 18 + Vite
- Backend: Node.js + Express REST API
- Database: PostgreSQL
- Authentication: bcrypt password hashes + signed JWT
- Deployment target: Render Node web service + managed Neon PostgreSQL

## Local development

Requirements: Node.js 20+ and PostgreSQL.

1. Clone and install:
   ```bash
   git clone https://github.com/unnati-09m/demo2.git
   cd demo2
      npm run install:all
   ```

2. Create a local database:
   ```bash
   createdb alumniconnect
   ```
   If it already exists, skip this command.

3. Configure the API:
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with the PostgreSQL username/password that work on your machine. Set a long random JWT secret.

4. Create/upgrade tables and insert fictional demo accounts:
   ```bash
   npm run db:setup
   npm run seed
   ```

5. Start the application:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`. The Vite server proxies `/api` requests to Express at `http://localhost:4000`.

## Demo accounts

All seeded demo accounts use the password `Demo@123` unless `DEMO_PASSWORD` was overridden before seeding.

| Role | Email |
|---|---|
| Admin | admin@alumniconnect.test |
| Faculty | faculty@alumniconnect.test |
| Alumni | alumni@alumniconnect.test |
| Student | student@alumniconnect.test |
| Recruiter | recruiter@alumniconnect.test |

The seed also creates additional alumni profiles and sample opportunities/events. These are fictional demo records.

## Core API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard`, `GET /api/profile`, `PUT /api/profile`
- `GET /api/alumni`
- `GET/POST /api/mentorship`, `PATCH /api/mentorship/:id`
- `GET/POST /api/opportunities`, `POST /api/opportunities/:id/apply`
- `GET /api/my-applications`, `GET /api/managed-applications`
- `GET/POST /api/events`, `POST /api/events/:id/register`
- `GET/POST /api/announcements`, `GET /api/notifications`
- `GET /api/admin/users`, approval and account-status endpoints, reports and CSV export

## Tests and production build

```bash
npm test
npm run build
npm run check
```

GitHub Actions runs schema setup, seed data, database-backed API workflow tests and a React production build.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The intended student-project deployment is a Render Node web service serving the React build and API from one origin, connected to a managed Neon PostgreSQL database.

## Scope and safeguards

- Alumni and recruiter access is subject to institutional approval.
- Only verified and public alumni profiles appear in the student-facing directory.
- CSV export is administrator-only and protects values that could be interpreted as spreadsheet formulas.
- Donation records capture pledge interest and follow-up status; this version does not collect or transfer money.
- Email/SMS delivery, SSO, external identity verification and payment processing require third-party institutional/provider integrations and are not claimed as implemented.
- Demo data is fictional. Never use demo credentials or demo JWT secrets for a public production system.

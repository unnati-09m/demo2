# AlumniConnect — Alumni Management & Engagement Desktop App

AlumniConnect is a desktop application for an educational institution to keep alumni information in one place and support long-term engagement between alumni, current students and administrators.

## Main features
- Student, alumni and admin sign-in (new public registrations can create student/alumni accounts).
- Alumni profiles with graduation year, department, degree, company, role, location, skills and career summary.
- Searchable alumni directory with profile visibility control.
- Student-to-alumni mentorship requests, accept/decline workflow and in-app notifications.
- Alumni-shared internships, jobs and projects; student applications and application history.
- Community events, registrations and attendee counts.
- Donation pledge/interest records (the prototype does not collect money).
- Admin summary reports and alumni CSV export.
- Electron desktop features: secure preload/IPC bridge, native Save dialog, OS notifications, system tray, keyboard shortcuts and saved display preferences.

## Technology
- Desktop: Electron 45
- UI: React 18 + Vite
- API: Node.js + Express
- Database: PostgreSQL using the `pg` library
- Authentication: bcrypt password hashes + JWT
- Styling: plain CSS

## Architecture

```text
React Renderer
    | window.desktop (only approved desktop methods)
Electron Preload (contextBridge)
    | IPC invoke / event
Electron Main Process
    | native APIs: file dialog, notifications, tray, shortcuts
    |
React UI ---- REST/HTTP ---- Express API ---- PostgreSQL
```

Renderer does not import Node modules or access `fs`. Electron is configured with `nodeIntegration: false`, `contextIsolation: true` and `sandbox: true`. Database credentials remain in the server environment and are never packaged into the desktop renderer.

## Run on macOS / Windows / Linux

Requirements: Node.js 20+ and a running PostgreSQL server.

### 1. Clone and install

```bash
git clone -b integration/desktop https://github.com/unnati-09m/demo2.git
cd demo2
npm run install:all
```

### 2. Create the database

Create a database named `alumniconnect` in your local PostgreSQL instance.

For a local PostgreSQL installation where your macOS login is also the database role, you can use:

```bash
createdb alumniconnect
```

If you use the `postgres` database role, connect with psql and run:

```sql
CREATE DATABASE alumniconnect;
```

### 3. Configure the API

```bash
cp server/.env.example server/.env
```

Open `server/.env` and replace the example database username/password with the credentials that actually work on your machine. Do **not** leave the literal word `password` in the connection string.

Example format:

```env
PORT=4000
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_REAL_PASSWORD@localhost:5432/alumniconnect
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
```

If your local Postgres does not require a password, use the connection format that works for your local setup, for example `postgresql://YOUR_MAC_USERNAME@localhost:5432/alumniconnect`.

### 4. Create tables and demo records

```bash
npm run db:setup
npm run seed
```

The seed script creates fictional demo accounts and sample content. Password for all demo users is `Demo@123`:

| Role | Email |
|---|---|
| Admin | `admin@alumniconnect.test` |
| Alumni | `alumni@alumniconnect.test` |
| Student | `student@alumniconnect.test` |

### 5. Start the complete desktop app

```bash
npm run dev
```

This starts three processes:
1. Express API at `http://localhost:4000`
2. React/Vite dev server at `http://localhost:5173`
3. Electron desktop window after both servers are ready

Use `Cmd/Ctrl + K` to focus global search and `Cmd/Ctrl + Shift + E` to open Events. Closing the window hides the app to the system tray; choose Quit AlumniConnect from the tray to exit.

For browser-only UI work, use `npm run dev:client` while the API is running separately with `npm run dev:server`.

## Demo flow
1. Sign in as the seeded Student. Find the alumni directory, send a mentorship request, apply for an opportunity and register for an event.
2. Sign in as Alumni. Update career details, accept/decline mentorship requests and publish a new opportunity or event.
3. Sign in as Admin. View summary reports and export the alumni directory using the native Save dialog.
4. Restart the desktop app and confirm database records and the saved theme preference remain.

## Persistence
- PostgreSQL persists user accounts, alumni profiles, mentorship requests, career opportunities, applications, events, registrations, donation pledges and notifications.
- Electron Main persists desktop preferences (currently theme/sidebar preference) in the app's user-data folder.
- React state is transient UI state such as the selected page, search text and current form values.

## Team branches
Read [docs/TEAM_WORK_SPLIT.md](docs/TEAM_WORK_SPLIT.md) for named feature ownership and Git workflow.

- `feat/unnati-desktop-core` — Unnati
- `feat/arshiyan-alumni-directory` — Arshiyan
- `feat/nayan-jyoti-engagement` — Nayan Jyoti
- `integration/desktop` — shared integration branch

Feature PRs target `integration/desktop`. The final tested integration PR targets `main`.

## Documentation
- `docs/requirements.md`: problem, scope, actors and functionality.
- `docs/subject-mapping.md`: ISD, ASD, DBMS and DE mapping.
- `docs/architecture.md`: Electron process model, IPC and persistence.
- `docs/test-checklist.md`: manual test plan.
- `docs/TEAM_WORK_SPLIT.md`: ownership, file boundaries and branches.

## Scope and honest limitations
This is an academic prototype using fictional sample data. Notifications are in-app plus native desktop notifications when the Electron app receives new notification records; no email/SMS provider is connected. Donation pledges record an expression of interest and do not collect or transfer money. There is no institutional SSO or automated alumni identity verification. The app currently expects a separately running Express API and PostgreSQL service; the Electron desktop shell is not yet an all-in-one installer.

Before any public deployment, replace demo credentials and JWT secret, configure HTTPS hosting, and review privacy, consent and retention requirements for real alumni data.

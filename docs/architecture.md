# AlumniConnect — System Architecture

## Deployment model
AlumniConnect is a browser-based web application. The React production build is served by the same Express process that exposes the REST API. PostgreSQL stores institutional and engagement data.

```text
Browser
  |
  | HTTPS / same origin
  v
Express + Node.js
  |-- REST API (/api/*)
  |-- Static React build (client/dist)
  |
  v
PostgreSQL (local during development / Neon when deployed)
```

## Frontend
- React 18 + Vite.
- Role-specific navigation and overview screens for student, alumni, faculty, admin and recruiter.
- Components render profile, directory, mentoring, opportunities, applications, events, announcements, notifications, reports and account-management workflows.
- The browser sends a JWT in the Authorization header for protected API calls.
- Vite proxies /api to the local Express service during development.

## Backend
- Node.js + Express.
- Authentication middleware verifies the JWT and checks the current account status in PostgreSQL.
- Role middleware enforces the permitted role for each operation.
- Active-account middleware blocks pending or suspended accounts from member-only actions.
- Request handlers use parameterized PostgreSQL queries.
- Central error handling returns safe API error messages and maps common constraint errors to 400/409 responses.
- In production, Express serves the built React application from client/dist.

## Roles and access
| Role | Main capabilities |
|---|---|
| Student | Profile, verified alumni directory, mentorship requests, applications, events, announcements and notifications |
| Alumni | Profile and career history, mentorship inbox, opportunity posts, applicant review, events and pledge interest |
| Faculty | Alumni and mentorship visibility, events, reports and announcements |
| Administrator | Account verification/access, institution reports, donation follow-up and alumni CSV export |
| Recruiter | Company profile, opportunities and applicant review after approval |

Administrators and faculty accounts are provisioned by the institution/seed process. Public registration is available to students, alumni and recruiters only. Alumni and recruiter accounts are pending until approved.

## Database
PostgreSQL tables include:
- users
- student_profiles
- alumni_profiles
- faculty_profiles
- recruiter_profiles
- career_history
- mentorship_requests
- opportunities
- opportunity_applications
- events
- event_registrations
- donation_pledges
- notifications
- announcements

Foreign keys, uniqueness constraints, check constraints and indexes protect relational data and frequent lookups. The setup script is repeatable and upgrades the earlier prototype schema without dropping user data.

## Deployment configuration
- Render runs the Node web service and serves both React and API.
- Neon supplies managed PostgreSQL.
- Runtime secrets are set in the hosting dashboard through environment variables.
- The /api/health endpoint checks both the application and database connection.

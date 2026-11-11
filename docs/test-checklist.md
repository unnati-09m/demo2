# Manual Test Checklist

## Setup
1. Create the PostgreSQL database.
2. Copy server/.env.example to server/.env and set DATABASE_URL and JWT_SECRET.
3. Run npm install in server and client.
4. Run npm run db:setup and npm run seed in server.
5. Start the API and Vite client.

## Authentication
- [ ] GET /api/health returns status ok.
- [ ] Login with the seeded student account.
- [ ] Login with the seeded alumni account.
- [ ] Login with the seeded admin account.
- [ ] Register a new student and alumni account.
- [ ] Incorrect password returns a clear error.
- [ ] A protected route without a token returns 401.

## Alumni and mentorship
- [ ] Alumni updates company, role, graduation year, skills and biography.
- [ ] Updated alumni profile appears in the public directory.
- [ ] Student searches the alumni directory.
- [ ] Student submits a mentorship request.
- [ ] Alumni accepts or declines the request.
- [ ] Student receives an in-app notification.

## Career opportunities
- [ ] Alumni publishes an internship, job or project opportunity.
- [ ] Student views the opportunity.
- [ ] Student applies to the opportunity.
- [ ] Duplicate applications are prevented by a database constraint.

## Events and support
- [ ] Alumni/admin creates an event.
- [ ] Student/alumni registers for the event.
- [ ] Duplicate event registrations are prevented.
- [ ] Alumni records a donation pledge interest.
- [ ] The UI explains that no money is collected.

## Administration
- [ ] Admin sees user, mentorship, opportunity and pledge summary data.
- [ ] Admin downloads the alumni CSV export.
- [ ] Student cannot open admin-only reports.

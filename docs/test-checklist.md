# Manual Acceptance Test Checklist

## Setup and accounts
- [ ] Run PostgreSQL locally and create the alumniconnect database.
- [ ] Copy server/.env.example to server/.env and set DATABASE_URL and JWT_SECRET.
- [ ] Run npm run db:setup and npm run seed.
- [ ] Run npm run dev and open http://localhost:5173.
- [ ] Sign in with the demo student, alumni, faculty, admin and recruiter accounts.

## Student
- [ ] Register a new student with academic details.
- [ ] Update the student profile and confirm unchanged fields are preserved.
- [ ] Search the alumni directory and filter by department.
- [ ] Send a mentorship request to a verified alumnus.
- [ ] Confirm that request appears in that alumnus's Mentorship portal.
- [ ] Apply to an opportunity and view it under My Applications.
- [ ] Register for an upcoming event.
- [ ] Mark a notification as read.

## Alumni
- [ ] Register a new alumni account and confirm it is pending approval.
- [ ] Approve the account from Admin and sign in again.
- [ ] Complete and save the alumni profile.
- [ ] Add and remove career-history records.
- [ ] Accept, decline and complete mentorship requests.
- [ ] Create an opportunity and review its student applicants.
- [ ] Update an application status and confirm the student receives a notification.
- [ ] Create an event and record pledge interest.

## Recruiter
- [ ] Register a recruiter and confirm pending approval.
- [ ] Approve the account as Admin.
- [ ] Create an opportunity.
- [ ] Review student applicants and update an application status.

## Faculty
- [ ] Sign in to the faculty workspace.
- [ ] Create an event and publish an announcement.
- [ ] Review engagement reports.

## Administrator
- [ ] Review pending alumni and recruiter registrations.
- [ ] Approve and reject test accounts.
- [ ] Suspend and reactivate a non-admin account.
- [ ] View institution reports and donation pledge records.
- [ ] Export the alumni directory as CSV.
- [ ] Confirm non-admin accounts cannot access admin-only endpoints.

## Deployment
- [ ] /api/health reports that PostgreSQL is connected.
- [ ] Main page loads over HTTPS.
- [ ] Test the major workflows against deployed PostgreSQL.

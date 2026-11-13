# Three-Person Full-Stack Work Split

The application has exactly three user roles: Student, Alumni and Admin. Each teammate owns the frontend, backend, PostgreSQL changes and tests for their assigned feature area. This is a feature-based split, not a split where one person does only UI and another only APIs.

## Unnati — Core, identity and student experience
- Frontend: authentication, registration, student experience, role-based app shell and role-specific dashboards.
- Backend: registration/login, account status, role access, dashboard and student-profile endpoints.
- Database: users and student profile schema/migrations, seed account flows.
- Testing: student onboarding, auth, profile preservation, role permissions and integration tests.
- Coordination: review integration, deployment configuration and final system validation.

## Arshiyan — Alumni records and career pathways
- Frontend: alumni directory/profile experience, career timeline, opportunities, applications and applicant review.
- Backend: alumni search/profile/career history, opportunity posting, application submission/review and CSV export endpoints.
- Database: alumni profile, career history, opportunities and application schema/migrations.
- Testing: profile updates, verification visibility, filters, applications, duplicate prevention and export safety.

## Nayan Jyoti — Community engagement and institutional operations
- Frontend: mentorship, events, notifications, announcements, admin user management, donation tracking and reports.
- Backend: mentorship lifecycle, event and registration APIs, notifications, announcements, approval/reporting and pledge tracking.
- Database: mentorship, events, registrations, notifications, announcements and donation records.
- Testing: cross-account mentorship, event registration, notifications, admin permissions, approval and reporting.

## Shared rules
1. Each person works on one personal feature branch based on the PS-aligned main branch.
2. Keep changes within your feature ownership; coordinate edits to shared files before making them.
3. Put database changes in repeatable migration/schema updates.
4. Add or update API and UI tests for every workflow changed.
5. Run the relevant tests and the production build before pushing.
6. Use your own GitHub account and make genuine commits as the work is completed. Do not backdate or misattribute contributions.
7. Open a pull request targeting main. Review and test before merging.

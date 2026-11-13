# AlumniConnect — Problem Statement and Requirements

## Problem statement
Most educational institutions do not have a reliable or centralized system to manage alumni data. After graduation, contact information, academic records and career updates can become scattered or lost. Informal WhatsApp groups and outdated mailing lists make long-term alumni communication difficult. This limits mentorship, internships, collaboration, event participation and fundraising.

AlumniConnect addresses this gap with a centralized alumni management and engagement platform.

## Intended impact
- Strengthen long-term relationships between alumni and their institution.
- Create structured mentorship, internship and collaboration opportunities.
- Improve alumni outreach and fundraising follow-up.
- Give administrators and faculty a reliable view of alumni data and engagement.
- Make it easier for current students to learn from graduates and access career opportunities.

## Stakeholders
- Alumni and graduates.
- Current students.
- Faculty and institution administrators.
- College/university management.
- Employers and recruiters.

## Functional requirements

### Central alumni records
1. Store alumni contact, education, graduation, department, career, company, location, skills and professional profile data.
2. Let alumni update their profile and career history.
3. Support public/private directory visibility.
4. Support institutional verification before a newly registered alumnus appears in the student-facing directory.
5. Allow administrators to search, review and export alumni records.

### Accounts and access
1. Support exactly three account roles: students, alumni and administrators.
2. Allow students to register and use student services after registration.
3. Put alumni registrations in a pending state until an institution administrator approves them.
4. Do not allow public self-registration as administrator.
5. Store password hashes and protect API routes using signed authentication tokens.

### Networking and communication
1. Let students search verified public alumni profiles.
2. Let students send a mentorship request to a selected alumnus.
3. Let the alumnus see the request in their own portal and accept, decline or complete it.
4. Notify the student when the request status changes.
5. Let administrators/institution staff publish announcements to the whole community, students or alumni.
6. Store in-app notifications and allow the recipient to mark them as read.

### Career and opportunities
1. Let alumni maintain a career timeline.
2. Let verified alumni and administrators publish internships, jobs and projects; employer/company information is captured in each listing.
3. Let students submit applications and view application history.
4. Let opportunity owners review applicants and update application status.
5. Notify students when their application status changes.

### Events and institutional engagement
1. Let alumni and administrators create events.
2. Let students and alumni register for events.
3. Show registration counts and prevent duplicate registrations.
4. Let alumni record donation pledge interest.
5. Let administrators track pledge follow-up status. The prototype does not collect or transfer money.

### Administration
1. Review and approve/reject alumni registrations.
2. Activate or suspend community accounts.
3. Review engagement and institutional summary reports.
4. Export alumni directory data as CSV.

## Non-functional requirements
- Responsive browser-based interface.
- Role-based authorization on the server, not just hidden UI controls.
- Parameterized SQL queries.
- Password hashing using bcrypt.
- Relational constraints and indexes in PostgreSQL.
- Verified-only alumni directory for student users.
- Secrets kept in environment variables, not source control.
- Repeatable database setup and automated smoke testing.

## Out of scope for this prototype
Institutional SSO, automated identity-document verification, external email/SMS delivery, real payment processing, and integration with a college student-information system require institutional/provider integrations. They are not claimed as implemented.

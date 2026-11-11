# AlumniConnect — Requirements and System Design

## 1. Problem statement
Many educational institutions do not have a reliable, centralized way to manage alumni data. Alumni contact information, academic records and career updates may be scattered across multiple platforms or become outdated. Informal communication channels make long-term engagement difficult and limit opportunities for mentorship, internships, collaboration, events and fundraising.

## 2. Proposed solution
AlumniConnect is a web-based alumni management and engagement platform. It maintains alumni profiles in one searchable directory and supports communication through mentorship requests and in-app notifications. Alumni can share career opportunities, create events and record donation pledges. Students can explore alumni, request mentorship, apply for opportunities and register for events. Administrators can monitor community activity and export alumni data.

## 3. Stakeholders and roles
- **Alumni:** maintain career profile, respond to mentorship requests, publish opportunities/events and record donation interest.
- **Current students:** search the alumni directory, request mentorship, apply for opportunities and register for events.
- **Administrator:** view summary reports and export the alumni directory.

## 4. Functional requirements
1. Users can register and sign in using email and password.
2. The system distinguishes alumni, students and administrators.
3. Alumni can create and update graduation, education, company, job, location, skill and biography details.
4. Public alumni profiles can be searched by name, company, department and graduation year.
5. Students can send a mentorship request with a topic and message.
6. Alumni can accept or decline a mentorship request.
7. Alumni can post internships, jobs and project opportunities.
8. Students can apply to an opportunity and view their submitted applications through the API.
9. Alumni and administrators can create events; registered users can register for events.
10. Alumni can record a donation pledge/interest, including amount and purpose. This prototype does not collect or transfer money.
11. Users can view in-app notifications and mark them as read.
12. Administrators can view summary counts and export alumni records as CSV.

## 5. Non-functional requirements
- Passwords are stored as bcrypt hashes, not plain text.
- Protected endpoints require a signed JWT.
- Role middleware restricts selected operations.
- SQL values use parameterized queries.
- Foreign keys and database constraints preserve data integrity.
- Public directory results only include profiles marked public.
- The interface is responsive for desktop and mobile layouts.

## 6. Main data entities and relationships
- User 1:1 AlumniProfile (for alumni accounts).
- User(Student) 1:N MentorshipRequest as requester.
- User(Alumni) 1:N MentorshipRequest as mentor.
- User(Alumni) 1:N Opportunity.
- Opportunity 1:N OpportunityApplication.
- Event 1:N EventRegistration.
- User 1:N EventRegistration.
- User 1:N Notification.
- User(Alumni) 1:N DonationPledge.

## 7. Context-level data flow
Student, Alumni and Admin interact with the AlumniConnect web application. The application validates requests, applies role permissions and reads/writes the PostgreSQL database. It returns directory results, application state, event details, notifications and reports to the users.

## 8. Scope limitations
This is a functional academic prototype. It does not integrate institutional SSO, external email/SMS delivery, real donation payment gateways, background verification services or a production student information system. Demo records are fictional. In-app notifications demonstrate the communication workflow.

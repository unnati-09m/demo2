# Team Work Split — AlumniConnect Desktop

**Team size: 3 people**  
**Members: Unnati, Arshiyan, Nayan Jyoti**

This file is the shared source of truth for task ownership and Git workflow. The existing React + Express + PostgreSQL application is the starting baseline. The next development stage adds the Electron desktop layer while keeping the AlumniConnect problem description and core modules unchanged.

## Branch structure

| Branch | Owner | Purpose |
|---|---|---|
| `integration/desktop` | Shared integration branch | Common base, reviewed feature merges and final desktop integration |
| `feat/unnati-desktop-core` | Unnati | Electron shell, Preload/IPC, native OS integration, authentication and integration |
| `feat/arshiyan-alumni-directory` | Arshiyan | Alumni profiles, directory/search, career opportunities, applications and CSV export |
| `feat/nayan-jyoti-engagement` | Nayan Jyoti | Mentorship, events, registrations, notifications and admin summaries |

All three feature branches are created from `integration/desktop`. Each teammate works on their own branch and opens a pull request **back into `integration/desktop`**, not directly into `main`. Once the features are reviewed and tested together, the team can open one final pull request from `integration/desktop` to `main`.

## Individual ownership and deliverables

### 1. Unnati — Desktop Core, Authentication and Integration

**Owns**
- Electron Main Process and BrowserWindow setup.
- Secure Preload API using `contextBridge`.
- IPC handlers for native operations.
- Native OS features: Save File dialog for CSV reports, desktop notifications, system tray and keyboard shortcuts.
- Authentication flow and role-aware app entry (Admin, Alumni, Student).
- App startup, API connection, cross-feature integration and final end-to-end testing.

**Planned areas**
- `desktop/main.js`
- `desktop/preload.js`
- `desktop/ipc/`
- `desktop/tray.js`
- `client/src/features/auth/`
- Electron configuration and root scripts.

**Acceptance checks**
- React Renderer has no direct `fs`, Node.js or unrestricted Electron access.
- Renderer can call only the explicitly exposed Preload methods.
- Invalid or unauthenticated users cannot access protected app screens/API operations.
- Native dialogs and notifications work on the target desktop OS.

### 2. Arshiyan — Alumni Profiles, Directory and Career Opportunities

**Owns**
- Create and edit alumni profiles: graduation year, department, degree, company, job title, location, skills, biography and LinkedIn URL.
- Alumni directory with search and filters (name, batch/year, department and company).
- Career opportunities: alumni can publish internships/jobs/projects.
- Student opportunity applications and application-status visibility.
- Alumni directory CSV export and the query/data mapping required for it.

**Planned areas**
- `client/src/features/alumni/AlumniPages.jsx` — alumni directory and profile components.
- `client/src/features/opportunities/OpportunityPages.jsx` — opportunity listings and student application history.
- Corresponding alumni and opportunity API sections under `server/src/index.js`.
- Alumni/opportunity DB queries and tests.

**Acceptance checks**
- Alumni can update their own profile.
- Directory results reflect saved data and filters.
- Public/private profile visibility is respected.
- Alumni can publish an opportunity; students can apply.
- CSV export contains the agreed alumni fields and handles commas/quotes safely.

### 3. Nayan Jyoti — Mentorship, Events and Community Engagement

**Owns**
- Student-to-alumni mentorship requests with topic and message.
- Alumni accept, decline or complete mentorship requests.
- Event creation and event registration.
- In-app notifications for mentorship updates and relevant event activity.
- Admin summaries for users, mentorship requests, events/opportunities and engagement records.

**Planned areas**
- `client/src/features/engagement/EngagementPages.jsx` — mentorship, events, notifications and admin report components.
- Corresponding API sections under `server/src/index.js`.
- Related database queries and tests.

**Acceptance checks**
- A student can request guidance from an alumnus.
- Only the requested alumnus can update the request status.
- Users can register for an event only once.
- Notification records are linked to the correct recipient and can be marked as read.
- Admin summary values come from database queries, not hard-coded numbers.

## Shared architecture (same for all teammates)

- **React Renderer:** UI, pages, components and temporary view state only.
- **Electron Preload:** small, explicit API surface exposed with `contextBridge`.
- **Electron Main:** app window, native OS APIs, tray, dialogs and IPC handlers.
- **Express API:** authentication, authorization, validation and application/business logic.
- **PostgreSQL:** persistent users, alumni profiles, mentorship, opportunities, applications, events, registrations, notifications and pledge records.

Do not access the filesystem or Node.js APIs directly from React. Use the Electron Main/Preload/IPC boundary for native desktop operations. Keep PostgreSQL credentials on the server; never package database secrets inside the desktop app.

## Persistence responsibility

- PostgreSQL stores application records and must retain them after the app restarts.
- Local desktop preferences (for example theme and last window size) are persisted separately by the desktop layer.
- React state is used only for transient UI state such as open tabs, search text and unsaved form input.

## File ownership and avoiding merge conflicts

The React app shell now lives in `client/src/App.jsx`; its feature pages are separate owner-specific components. Unnati owns the shell, authentication and navigation. Arshiyan owns `AlumniPages.jsx` and `OpportunityPages.jsx`; Nayan Jyoti owns `EngagementPages.jsx`. Avoid editing another person's feature file without coordinating.

The Express API is currently kept in `server/src/index.js` for beginner-friendly navigation, with feature-owner comments marking each route section. Because it is a shared file, coordinate API changes with Unnati before changing routes or shared middleware. As the project grows, route sections can be extracted into separate routers without changing the API contract.

Add a short ownership comment at the top of new feature files, for example:

```js
// Feature owner: Arshiyan
// Module: Alumni directory
// Responsibility: alumni search, filters and profile display
```

For Nayan Jyoti's files, use `Feature owner: Nayan Jyoti`; for Unnati's desktop files, use `Feature owner: Unnati`. These comments document actual code ownership; they are not substitutes for the GitHub branch history or PR review.

## Git workflow

Each teammate must use their own GitHub account and commit their own work. Do not share credentials or change Git author identity to make commits appear under another person's name.

1. Clone the repo once, or pull the latest changes if it is already cloned.
2. Checkout your assigned feature branch.
3. Work only on your owned feature files. Pull the integration branch regularly before starting a new task.
4. Make commits for real units of work (setup, UI, API, validation, tests, bug fixes).
5. Push your feature branch and open a pull request into `integration/desktop`.
6. Another teammate reviews and tests it. Resolve feedback before merging.
7. After all features are merged, test the integrated application and open the final PR from `integration/desktop` to `main`.

Example commands (replace the branch name with your assigned branch):

```bash
git fetch origin
git checkout feat/arshiyan-alumni-directory
git pull origin feat/arshiyan-alumni-directory

# After completing a real, reviewable change:
git add .
git commit -m "feat(directory): add alumni search and filters"
git push origin feat/arshiyan-alumni-directory
```

Use meaningful commit messages. There is no required artificial commit count; commits should show genuine implementation, testing, documentation and fixes.

## Team integration rules

- Agree API request/response shapes before a feature is integrated.
- Coordinate database schema changes; do not independently rename shared tables/columns.
- Do not commit `.env`, passwords, database URLs, `node_modules` or generated build folders.
- Every PR should describe what changed, how to run/test it and any known limitations.
- Do not merge a PR that breaks the build or another member's feature.
- Keep the final demo data fictional and do not upload real alumni personal information without permission.

## Definition of done

A feature is ready to merge when:
- Its main user flow works.
- It uses the agreed API and database schema.
- It includes validation and understandable error states.
- It has been tested by the owner and reviewed by another teammate.
- The owner can explain the code and demonstrate the flow.


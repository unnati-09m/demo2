# Antigravity Handoff — Read Before Editing

This file explains the current project in beginner-friendly terms. Read it before asking an AI coding assistant to change code.

## What the app does

AlumniConnect is a desktop app for a college alumni community.

- **Student:** searches alumni, requests mentorship, applies to opportunities and registers for events.
- **Alumni:** updates career details, responds to mentorship, posts internships/jobs and creates events.
- **Admin:** views community summaries and exports alumni information.

The project uses fictional seed data. Donation pledges are only records of interest; there is no payment gateway.

## How the application starts

Run `npm run dev` from the repository root. It starts three programs:

1. **Express API** at `http://localhost:4000` — handles login and application data.
2. **Vite/React** at `http://localhost:5173` — renders the UI during development.
3. **Electron** — opens a desktop window after the API and Vite server are ready.

PostgreSQL must already be running. Create the database and configure `server/.env` first. Use your actual local database username and password; do not use the example placeholder word `password`.

## Where code lives

| Path | What it does | Main owner |
|---|---|---|
| `desktop/main.js` | Electron window, menu, tray and shortcuts | Unnati |
| `desktop/preload.cjs` | Small safe API exposed to React | Unnati |
| `desktop/ipc/register-handlers.js` | Native Save dialog, local settings and notifications | Unnati |
| `client/src/App.jsx` | React app shell, authentication and feature sections | Shared integration; sections have owner comments |
| `client/src/styles.css` | UI styling and saved dark theme | Shared UI |
| `server/src/index.js` | Express routes, validation and database calls; sections have owner comments | Shared API |
| `server/src/schema.sql` | PostgreSQL tables and relationships | Shared DB |
| `server/src/seed.js` | Fictional demo users and sample alumni/opportunities/events | Shared DB |
| `docs/TEAM_WORK_SPLIT.md` | People, branches, ownership and pull-request rules | Team reference |

## Electron security rule

React must never import `fs`, `path`, `electron` or Node.js modules. When React needs a native desktop action, it calls a method exposed as `window.desktop.*`. Preload sends a named IPC request. Electron Main performs the native operation and returns a simple result.

Do not set `nodeIntegration: true`. Keep `contextIsolation: true` and `sandbox: true`.

## Persistence in simple terms

- **PostgreSQL:** real application records such as users, alumni profiles, mentorship requests, opportunities, events and notifications.
- **Electron local preferences JSON:** display preferences such as light/dark theme, stored in the app's user-data folder.
- **React state:** temporary UI state such as selected page, current search text, open modal and unsaved input.

Do not put a database password in React or inside the packaged desktop app.

## Team branches

- Unnati: `feat/unnati-desktop-core`
- Arshiyan: `feat/arshiyan-alumni-directory`
- Nayan Jyoti: `feat/nayan-jyoti-engagement`
- Integration: `integration/desktop`

Every feature branch starts from the same integration baseline. Work on your own branch. Push only your own changes. Open a pull request into `integration/desktop`, get a review and test the combined app before merging.

## Simple prompts for Antigravity

Use one task at a time. Do not ask it to rewrite the whole application in one response.

### Unnati
"Read README.md, docs/architecture.md and docs/TEAM_WORK_SPLIT.md. Work only on the Electron desktop-core tasks assigned to Unnati. Keep JavaScript beginner-friendly. Preserve secure Main/Renderer/Preload separation. Do not access Node.js or fs from React. Run the checks and explain every changed file."

### Arshiyan
"Read README.md and docs/TEAM_WORK_SPLIT.md. Work only on alumni profiles, alumni directory/search, opportunities, student applications and CSV export. Keep the existing PostgreSQL schema and API contracts unless a coordinated change is necessary. Use simple JavaScript and explain the code and tests."

### Nayan Jyoti
"Read README.md and docs/TEAM_WORK_SPLIT.md. Work only on mentorship, events, registrations, notifications and admin summaries. Keep the existing role checks and database relationships. Use simple JavaScript and explain the code and tests."

## Honest Git history

Make commits when real work is completed: one feature, validation, test, documentation update or bug fix. Each person uses their own GitHub account. Do not backdate commits or create commits under another person's identity. A real incremental history is more useful than an artificial commit count.

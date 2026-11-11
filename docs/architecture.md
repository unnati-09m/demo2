# AlumniConnect Desktop Architecture

## 1. Process model

### React Renderer
The Renderer contains React pages and feature components. It handles user interaction and temporary UI state only. It does not import Electron, Node.js, `fs`, or other privileged APIs.

### Preload
`desktop/preload.cjs` exposes a small `window.desktop` API via `contextBridge`:
- `getAppInfo()`
- `getPreferences()`
- `savePreferences(preferences)`
- `saveAlumniCsv(csvText)`
- `showNotification(notification)`
- `onShortcut(callback)`

The Renderer cannot call arbitrary IPC channels. Every exposed action has a matching handler.

### Electron Main
`desktop/main.js` creates the BrowserWindow and configures:
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`

The Main Process registers keyboard shortcuts, menus and the system tray. Native APIs are invoked only from Main Process/IPC handlers.

## 2. IPC flow examples

### CSV export
1. Admin asks the API for the alumni CSV.
2. React receives the CSV text.
3. React calls `window.desktop.saveAlumniCsv(csvText)`.
4. Preload invokes `dialog:save-csv`.
5. Main opens the native Save dialog and writes the selected file.
6. Main returns whether the dialog was cancelled or where the file was saved.

### Native notification
1. The API stores a notification record in PostgreSQL.
2. React refreshes its notification list.
3. The Renderer calls the approved `window.desktop.showNotification()` method for a new record.
4. Preload sends the request to Main through IPC.
5. Main uses Electron's Notification API.

### Keyboard shortcuts
- `Cmd/Ctrl + K`: focus the alumni/global search input.
- `Cmd/Ctrl + Shift + E`: open the Events page.

Main sends a small named action to the Renderer. The Renderer decides which UI state to update.

## 3. Persistence model

| Data | Storage | Why |
|---|---|---|
| Accounts and roles | PostgreSQL | Shared application identity |
| Alumni profiles and career updates | PostgreSQL | Long-term records |
| Mentorship, events and registrations | PostgreSQL | Workflow and history |
| Opportunities and applications | PostgreSQL | Career engagement |
| Donation pledge interests | PostgreSQL | Fundraising follow-up |
| Notifications | PostgreSQL | Survive app restarts |
| Theme and desktop preferences | JSON in Electron app userData | Local device preferences |
| Current tab/search/modal/form | React state | Temporary UI state |

## 4. Backend

React calls the Express REST API over HTTP. Express validates requests, verifies JWTs, applies role middleware and uses parameterized PostgreSQL queries. PostgreSQL constraints and foreign keys protect data integrity.

The desktop app does not contain the database password. The API reads `server/.env` on the host that runs the API service.

## 5. Development runtime

`npm run dev` starts the API, Vite server and Electron process using `concurrently`. Electron waits for API and Vite to become available before opening the window.

In the current academic prototype the Express API and PostgreSQL service are separate prerequisites. A packaged, all-in-one installer with managed backend/database provisioning is outside the current scope.

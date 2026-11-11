# Desktop Application Test Checklist

## A. Architecture and security
- [ ] Electron window opens from `npm run dev`.
- [ ] Preload file is loaded successfully.
- [ ] `window.desktop` exposes only approved methods.
- [ ] `nodeIntegration` is false, `contextIsolation` is true and sandbox is enabled.
- [ ] React files do not import `fs`, `path`, `electron` or Node.js modules.
- [ ] Protected API routes return 401 without a valid JWT.
- [ ] Role-protected routes reject the wrong role.

## B. Native OS integration
- [ ] Admin CSV export opens the native Save dialog.
- [ ] Cancelling the Save dialog does not show a false success message.
- [ ] A new mentorship/event notification can display a native OS notification.
- [ ] System tray menu can show/hide the app and quit it.
- [ ] Double-clicking the tray icon restores the app.
- [ ] Cmd/Ctrl + K focuses the search field.
- [ ] Cmd/Ctrl + Shift + E opens Events.

## C. Persistence
- [ ] Update an alumni profile and refresh the page; data remains.
- [ ] Create an event and restart the app; event remains.
- [ ] Register for an event and restart the app; registration remains.
- [ ] Send a mentorship request and restart the app; request remains.
- [ ] Change theme, quit the app completely and reopen; theme remains.
- [ ] Confirm temporary search text/modal state is not stored as permanent app data.

## D. Feature workflows
- [ ] Student can search alumni by name, company and department.
- [ ] Student can send a mentorship request.
- [ ] Alumni can accept or decline a request.
- [ ] Student can view internship/job opportunities and apply.
- [ ] Alumni can post an opportunity.
- [ ] Alumni/admin can create an event.
- [ ] A user can register for an event only once.
- [ ] Alumni can record donation pledge interest (no actual payment).
- [ ] Admin can see summary reports and export alumni records.

## E. Error handling and demo
- [ ] Invalid login displays a clear message.
- [ ] Duplicate event registration displays a clear message.
- [ ] Duplicate opportunity application displays a clear message.
- [ ] Empty directory and empty lists show useful empty states.
- [ ] Demo account credentials work after `npm run seed`.
- [ ] The README setup steps work on a clean clone.

# Desktop Layer — Owner: Unnati

This folder contains Electron Main, Preload and IPC code.

Owned work:
- Main window lifecycle and menu.
- Secure Preload API.
- IPC handlers for native Save dialog, notifications and local preferences.
- System tray and keyboard shortcuts.
- Electron integration with the React application.

Security rules:
- Renderer must not import Electron or Node.js modules.
- Keep nodeIntegration disabled, contextIsolation enabled and sandbox enabled.
- Expose only the minimal methods React actually needs through contextBridge.

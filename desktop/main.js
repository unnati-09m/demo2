// Feature owner: Unnati — Electron Main Process, window, tray and native OS integration.
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, Notification } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc/register-handlers.js';
import { createAppTray } from './tray.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const developmentUrl = process.env.ELECTRON_START_URL;
const isDevelopment = Boolean(developmentUrl);

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    show: false,
    title: 'AlumniConnect',
    backgroundColor: '#f6f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (isDevelopment) {
    mainWindow.loadURL(developmentUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'AlumniConnect',
      submenu: [
        { label: 'About AlumniConnect', click: () => dialog.showMessageBox({ message: 'AlumniConnect', detail: 'Alumni management and engagement desktop application.' }) },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload application' },
        { role: 'toggleDevTools', label: 'Developer tools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+K', () => {
    mainWindow?.webContents.send('app:shortcut', 'focus-search');
    mainWindow?.show();
  });
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    mainWindow?.webContents.send('app:shortcut', 'open-events');
    mainWindow?.show();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers({
    app,
    dialog,
    ipcMain,
    Notification,
    getMainWindow: () => mainWindow
  });
  createApplicationMenu();
  createWindow();
  tray = createAppTray({ app, getMainWindow: () => mainWindow });
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  tray?.destroy();
});

app.on('window-all-closed', () => {
  // Keep the application available from the system tray until the user chooses Quit.
});

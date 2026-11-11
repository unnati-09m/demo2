import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_PREFERENCES = {
  theme: 'light',
  sidebarCompact: false
};

export function registerIpcHandlers({ app, dialog, ipcMain, Notification, getMainWindow }) {
  const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');

  ipcMain.handle('app:get-info', () => ({
    version: app.getVersion(),
    platform: process.platform
  }));

  ipcMain.handle('settings:get', async () => {
    try {
      const raw = await fs.readFile(preferencesPath, 'utf8');
      const saved = JSON.parse(raw);
      return {
        theme: saved.theme === 'dark' ? 'dark' : 'light',
        sidebarCompact: saved.sidebarCompact === true
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  });

  ipcMain.handle('settings:save', async (_event, preferences = {}) => {
    const safePreferences = {
      theme: preferences.theme === 'dark' ? 'dark' : 'light',
      sidebarCompact: preferences.sidebarCompact === true
    };
    await fs.mkdir(path.dirname(preferencesPath), { recursive: true });
    await fs.writeFile(preferencesPath, JSON.stringify(safePreferences, null, 2), 'utf8');
    return { saved: true, preferences: safePreferences };
  });

  ipcMain.handle('dialog:save-csv', async (_event, csvText) => {
    if (typeof csvText !== 'string' || csvText.length > 5_000_000) {
      throw new Error('Invalid CSV data.');
    }

    const window = getMainWindow();
    const result = await dialog.showSaveDialog(window || undefined, {
      title: 'Export alumni directory',
      defaultPath: 'alumni-report.csv',
      buttonLabel: 'Save CSV',
      filters: [{ name: 'CSV files', extensions: ['csv'] }]
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, csvText, 'utf8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('notification:show', async (_event, notification = {}) => {
    const title = String(notification.title || 'AlumniConnect').slice(0, 100);
    const body = String(notification.body || '').slice(0, 240);
    if (!Notification.isSupported()) return { shown: false, reason: 'unsupported' };
    new Notification({ title, body }).show();
    return { shown: true };
  });
}

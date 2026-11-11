// Keep this file small: only expose the desktop actions that the UI needs.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', Object.freeze({
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getPreferences: () => ipcRenderer.invoke('settings:get'),
  savePreferences: (preferences) => ipcRenderer.invoke('settings:save', preferences),
  saveAlumniCsv: (csvText) => ipcRenderer.invoke('dialog:save-csv', csvText),
  showNotification: (notification) => ipcRenderer.invoke('notification:show', notification),
  onShortcut: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('app:shortcut', listener);
    return () => ipcRenderer.removeListener('app:shortcut', listener);
  }
}));

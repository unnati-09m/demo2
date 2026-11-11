import { Menu, Tray, nativeImage } from 'electron';

export function createAppTray({ app, getMainWindow }) {
  // A small vector icon keeps the tray independent from external image assets.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="5" fill="#706bd0"/><path d="M5 9a4 4 0 0 1 6.8-2.8M13 9a4 4 0 0 1-6.8 2.8M11.8 4.8v2.5H9.3M6.2 13.2v-2.5h2.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const icon = nativeImage.createFromDataURL('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show AlumniConnect',
      click: () => {
        const window = getMainWindow();
        if (window) {
          window.show();
          window.focus();
        }
      }
    },
    {
      label: 'Hide window',
      click: () => getMainWindow()?.hide()
    },
    { type: 'separator' },
    { label: 'Quit AlumniConnect', click: () => app.quit() }
  ]);

  tray.setToolTip('AlumniConnect');
  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    const window = getMainWindow();
    if (window) {
      window.show();
      window.focus();
    }
  });

  return tray;
}

import { Menu, Tray, nativeImage } from 'electron';

export function createAppTray({ app, getMainWindow }) {
  // Keep the tray icon bundled as a small PNG so Electron can load it on desktop OSes.
  const iconData = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA3UlEQVR4nNVXQQ6EIAwsxP+4/9o9uC/Rg/uv9UXrwWg2UCqdQMUmJgKmM05pBoguDictDs/vrxTQ9HmwWOxkSeAzIt4SnMvvpUULEp6btCQRlcA6HBH+9+PcH+/v1wIRgBX4B+fG1QmUinsSSMmNlEFNINx4+4OSgEsQ7nqURFYbcglTbaf5lihDAW1Cbk1S5J5dYEpAK6m2ZN0ZgTBBLniuN1TxAo0xQW4oqaB1RUiBFAhiye13QbMEJC/QxHFGtz6UEm13hHZKkLo61Yodz3OTVuARAQsSYf7Lb8crr6Jq5svgBx8AAAAASUVORK5CYII=';
  const icon = nativeImage.createFromBuffer(Buffer.from(iconData, 'base64'));
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

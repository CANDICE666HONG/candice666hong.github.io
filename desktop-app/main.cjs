const { app, BrowserWindow, Menu, protocol, session, dialog } = require('electron');
const { readFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const GAME_URL = 'tides://bay/';
const APP_ID = 'cn.candicehong.desktop-tides';
// A stable storage directory and origin keep records when the portable EXE moves.
const saveDirectory = join(app.getPath('appData'), 'DesktopTides');
mkdirSync(saveDirectory, { recursive: true });
app.setPath('userData', saveDirectory);
app.setName('桌边潮汐');
app.setAppUserModelId(APP_ID);
protocol.registerSchemesAsPrivileged([
  { scheme: 'tides', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let gameWindow;
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on('second-instance', () => {
    if (gameWindow?.isMinimized()) gameWindow.restore();
    gameWindow?.show();
    gameWindow?.focus();
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const html = readFileSync(join(__dirname, 'content/index.html'));
    protocol.handle('tides', request => {
      // No arbitrary filesystem routes or remote URL proxying.
      if (request.url !== GAME_URL || request.method !== 'GET') return new Response('', { status: 404 });
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] },
      (_details, callback) => callback({ cancel: true }),
    );
    gameWindow = new BrowserWindow({
      title: '桌边潮汐',
      width: 880,
      height: 680,
      useContentSize: true,
      minWidth: 480,
      minHeight: 420,
      center: true,
      backgroundColor: '#e9eeeb',
      show: false,
      autoHideMenuBar: true,
      icon: join(__dirname, 'resources/icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        webviewTag: false,
        navigateOnDragDrop: false,
        devTools: false,
      },
    });
    gameWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    gameWindow.webContents.on('will-navigate', (event, url) => { if (url !== GAME_URL) event.preventDefault(); });
    gameWindow.webContents.on('will-attach-webview', event => event.preventDefault());
    gameWindow.on('page-title-updated', event => event.preventDefault());
    gameWindow.once('ready-to-show', () => gameWindow.show());
    gameWindow.on('closed', () => { gameWindow = null; });
    return gameWindow.loadURL(GAME_URL);
  }).catch(error => {
    dialog.showErrorBox('桌边潮汐', '游戏未能打开，请重新下载后再试。\n' + error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}

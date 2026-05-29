const { app, BrowserWindow, Menu, shell } = require('electron');

const { createAppServer } = require('../server');
const { createExternalOpenHandler, createWindowOptions, getPetUrl } = require('./window-config');

const port = Number(process.env.PORT || 4321);
let server;
let mainWindow;

async function startLocalServer() {
  server = createAppServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow(createWindowOptions());
  mainWindow.webContents.setWindowOpenHandler(createExternalOpenHandler((url) => shell.openExternal(url)));
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'floating');
  await mainWindow.loadURL(getPetUrl(port));
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startLocalServer();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

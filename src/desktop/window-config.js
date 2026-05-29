function createWindowOptions() {
  return {
    width: 276,
    height: 78,
    minWidth: 180,
    minHeight: 54,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    title: 'AI 红绿灯桌宠',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}

function getPetUrl(port = 4321) {
  return `http://127.0.0.1:${port}`;
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'chatgpt.com',
  'gemini.google.com',
  'www.doubao.com',
  'chat.deepseek.com',
]);

function createExternalOpenHandler(openExternal) {
  return ({ url }) => {
    if (isAllowedExternalUrl(url)) {
      openExternal(url);
    }

    return { action: 'deny' };
  };
}

function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

module.exports = {
  createWindowOptions,
  createExternalOpenHandler,
  getPetUrl,
};

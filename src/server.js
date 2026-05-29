const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { createStatusStore } = require('./shared/status-model');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createAppServer() {
  const store = createStatusStore();

  return http.createServer(async (request, response) => {
    addCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.url === '/api/status' && request.method === 'GET') {
      sendJson(response, 200, store.getSnapshot());
      return;
    }

    if (request.url === '/api/status' && request.method === 'POST') {
      try {
        const payload = await readJsonBody(request);
        const snapshot = store.update(payload);
        sendJson(response, 200, snapshot);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }

    serveStatic(request, response);
  });
}

function addCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 16) {
        reject(new Error('Payload too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function serveStatic(request, response) {
  const urlPath = request.url === '/' ? '/index.html' : request.url;
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': getContentType(filePath) });
    response.end(data);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4321);
  createAppServer().listen(port, () => {
    console.log(`AI Traffic Pet running at http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createAppServer,
};

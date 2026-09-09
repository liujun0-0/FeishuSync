import http from 'node:http';
import { URL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = 7777;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';
const TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
const AUTH_URL_FILE = path.join(ROOT, 'feishu-auth-url.txt');
const REFRESH_TOKEN_FILE = path.join(ROOT, '.feishu-sync-refresh-token');

let pendingCodeResolve = null;
let shuttingDown = false;
const activeSockets = new Set();

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

function openInBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `cmd /c start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.log('Could not auto-open browser. Open this URL manually:');
      console.log(url);
    }
  });
}

function createServer() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    if (reqUrl.pathname !== '/callback') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const error = reqUrl.searchParams.get('error');
    const code = reqUrl.searchParams.get('code');

    if (!pendingCodeResolve) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No authorization request in progress. Return to the CLI.');
      return;
    }

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Authorization denied. Return to the CLI.');
      const resolve = pendingCodeResolve;
      pendingCodeResolve = null;
      resolve({ error: 'access_denied' });
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing code. Return to the CLI.');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Authorization complete. You can close this tab.');
    const resolve = pendingCodeResolve;
    pendingCodeResolve = null;
    resolve({ code });
  });

  server.on('connection', (socket) => {
    activeSockets.add(socket);
    socket.on('close', () => activeSockets.delete(socket));
  });

  return server;
}

function buildAuthUrl(clientId) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'docx:document docs:doc drive:drive offline_access wiki:wiki');
  return url.toString();
}

async function waitForAuthCode(clientId) {
  if (pendingCodeResolve) {
    throw new Error('Authorization already in progress');
  }

  const authUrl = buildAuthUrl(clientId);

  // Write the URL to a file so the user can find it even if the console output
  // is lost or the auto-open fails. This is critical for the "auth stuck" scenario.
  await fs.writeFile(AUTH_URL_FILE, [
    `# FeishuSync Authorization Required`,
    `# Time: ${new Date().toISOString()}`,
    `#`,
    `# Open this URL in your browser to re-authorize:`,
    authUrl,
    '',
  ].join('\n'), 'utf8');

  console.log('Authorization URL:', authUrl);
  openInBrowser(authUrl);

  return new Promise((resolve) => {
    pendingCodeResolve = resolve;
  });
}

async function exchangeCodeForToken({ clientId, clientSecret, code }) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    const message = data.error_description || data.error || 'Unknown error';
    throw new Error(`Token request failed (${data.code}): ${message}`);
  }

  return data;
}

async function refreshUserAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    const message = data.error_description || data.error || 'Unknown error';
    throw new Error(`Refresh token failed (${data.code}): ${message}`);
  }

  return data;
}

async function writeTokenFile(tokenPath, accessToken) {
  await fs.writeFile(tokenPath, `${accessToken}\n`, 'utf8');
}

async function readRefreshTokenFile() {
  try {
    const raw = await fs.readFile(REFRESH_TOKEN_FILE, 'utf8');
    const value = raw.trim();
    return value || null;
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeRefreshTokenFile(refreshToken) {
  await fs.writeFile(REFRESH_TOKEN_FILE, `${refreshToken}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = await readConfig();
  const clientId = requireConfigValue(config, 'auth.clientId');
  const clientSecret = requireConfigValue(config, 'auth.clientSecret');
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

  const server = createServer();
  server.listen(PORT, () => {
  });

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (pendingCodeResolve) {
      const resolve = pendingCodeResolve;
      pendingCodeResolve = null;
      resolve({ error: 'shutdown' });
    }
    for (const socket of activeSockets) {
      socket.destroy();
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  let refreshToken = await readRefreshTokenFile();
  let lastAuthUrlLogged = false;

  while (true) {
    if (shuttingDown) break;
    const attempt = refreshToken ? 'refresh' : 'auth';
    try {
      let tokenData;
      if (attempt === 'refresh') {
        lastAuthUrlLogged = false;
        tokenData = await refreshUserAccessToken({
          clientId,
          clientSecret,
          refreshToken,
        });
      } else {
        // Refresh token expired or missing — need browser authorization.
        // Only print the URL once per failure, not on every 10s retry loop.
        if (!lastAuthUrlLogged) {
          console.log('[auth] refresh_token expired or invalid. Opening browser for re-authorization...');
          lastAuthUrlLogged = true;
        }
        const result = await waitForAuthCode(clientId);
        if (result.error) {
          if (result.error === 'shutdown') break;
          console.log('[auth] Authorization was denied. Try again.');
          lastAuthUrlLogged = false;
          continue;
        }

        tokenData = await exchangeCodeForToken({
          clientId,
          clientSecret,
          code: result.code,
        });
        // Clean up auth URL file after successful authorization
        await fs.unlink(AUTH_URL_FILE).catch(() => {});
      }

      await writeTokenFile(tokenPath, tokenData.access_token);

      refreshToken = tokenData.refresh_token || null;
      if (refreshToken) {
        await writeRefreshTokenFile(refreshToken);
      }

      const expiresIn = Number(tokenData.expires_in || 0);
      const threshold = Math.max(Math.ceil(expiresIn * 0.3), 30);
      const waitSeconds = Math.max(5, expiresIn - threshold);
      console.log(`[auth] Token refreshed. Expires in ${expiresIn}s. Next refresh in ${waitSeconds}s.`);
      await sleep(waitSeconds * 1000);
    } catch (err) {
      if (shuttingDown) break;
      console.error('[auth] Error:', err.message || err);
      if (attempt === 'refresh') {
        console.log('[auth] Refresh failed. Will open browser for re-authorization in 5s...');
        refreshToken = null;
        lastAuthUrlLogged = false;
        await sleep(5_000);
      } else {
        console.log('[auth] Retrying in 10 seconds...');
        await sleep(10_000);
      }
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

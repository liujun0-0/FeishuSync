import http from 'node:http';
import { URL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync, unlinkSync } from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = 7777;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';
const TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
const TENANT_TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
const AUTH_URL_FILE = path.join(ROOT, 'feishu-auth-url.txt');
const REFRESH_TOKEN_FILE = path.join(ROOT, '.feishu-sync-refresh-token');
const AUTH_PID_FILE = path.join(ROOT, '.feishu-sync-auth.pid');
const TOKEN_REQUEST_TIMEOUT_MS = 30_000;

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
  // Browser launch is only a convenience. On managed Windows hosts the
  // child-process spawn can throw synchronously (EPERM); that must not abort
  // the OAuth listener before it starts waiting for the localhost callback.
  try {
    exec(cmd, (err) => {
      if (err) {
        console.log('Could not auto-open browser. Open this URL manually:');
        console.log(url);
      }
    });
  } catch (err) {
    console.log('Could not auto-open browser. Open this URL manually:');
    console.log(url);
  }
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
  // Include granular write scopes required by Drive title updates and
  // import_task-created docx files. Existing refresh tokens cannot gain new
  // scopes, so adding these takes effect on the next interactive re-auth.
  url.searchParams.set(
    'scope',
    'docx:document docx:document:write_only docs:doc drive:file:upload offline_access wiki:wiki'
  );
  return url.toString();
}

const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟超时——用户关了浏览器没授权也不会永远卡住

async function acquireAuthPid() {
  let previousPid = null;
  try {
    const raw = await fs.readFile(AUTH_PID_FILE, 'utf8');
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed > 0 && parsed !== process.pid) previousPid = parsed;
  } catch (err) {
    if (err?.code !== 'ENOENT') console.warn(`[auth] failed reading old pid: ${err.message || err}`);
  }

  if (previousPid) {
    try {
      process.kill(previousPid, 0);
      process.kill(previousPid, 'SIGTERM');
      console.log(`[auth] stopped previous auth process (pid ${previousPid})`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      // ESRCH means the pid file was stale; any other failure is non-fatal and
      // the listen() call below will still provide the definitive port check.
      if (err?.code !== 'ESRCH') console.warn(`[auth] failed stopping previous auth process: ${err.message || err}`);
    }
  }
  await fs.writeFile(AUTH_PID_FILE, `${process.pid}\n`, 'utf8');
}

function releaseAuthPid() {
  try {
    const raw = readFileSync(AUTH_PID_FILE, 'utf8').trim();
    if (raw === String(process.pid)) unlinkSync(AUTH_PID_FILE);
  } catch {
    // Best effort cleanup; the next auth start repairs stale state.
  }
}

class TokenRequestError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'TokenRequestError';
    this.code = code;
  }
}

async function waitForAuthCode(clientId) {
  if (pendingCodeResolve) {
    throw new Error('Authorization already in progress');
  }

  const authUrl = buildAuthUrl(clientId);

  // 写到文件，方便用户找到链接（即使控制台输出丢失或浏览器没自动打开）
  await fs.writeFile(AUTH_URL_FILE, [
    `# FeishuSync 需要重新授权`,
    `# 时间: ${new Date().toISOString()}`,
    `#`,
    `# 在浏览器中打开以下链接完成授权：`,
    authUrl,
    '',
  ].join('\n'), 'utf8');

  console.log('[auth] 需要重新授权。浏览器已打开。如果没自动打开，请打开 feishu-auth-url.txt');
  console.log('[auth] 等待授权... (5分钟内有效)');
  openInBrowser(authUrl);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingCodeResolve === resolve) {
        pendingCodeResolve = null;
        resolve({ error: 'timeout' });
      }
    }, AUTH_TIMEOUT_MS);

    pendingCodeResolve = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
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
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });

  const data = await response.json();
  if (data.code !== 0) {
    const message = data.error_description || data.error || 'Unknown error';
    throw new TokenRequestError(`Token request failed (${data.code}): ${message}`, data.code);
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
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });

  const data = await response.json();
  if (data.code !== 0) {
    const message = data.error_description || data.error || 'Unknown error';
    throw new TokenRequestError(`Refresh token failed (${data.code}): ${message}`, data.code);
  }

  return data;
}

// App-identity mode: does not require a browser or a user refresh token.
// The returned tenant token is short lived; the loop below renews it before
// expiry using the app credentials.
async function fetchTenantAccessToken({ clientId, clientSecret }) {
  const response = await fetch(TENANT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: clientId, app_secret: clientSecret }),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });
  const data = await response.json();
  if (data.code !== 0 || !data.tenant_access_token) {
    const message = data.msg || data.error_description || data.error || 'Unknown error';
    throw new TokenRequestError(`Tenant token request failed (${data.code ?? response.status}): ${message}`, data.code);
  }
  return { access_token: data.tenant_access_token, expires_in: data.expire || 7200 };
}

function isTokenRequestError(err) {
  return err instanceof TokenRequestError;
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
  const authMode = config.auth?.mode || 'user';
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

  // Enforce one auth owner before touching port 7777. This repairs stale PID
  // files left by crashes and prevents watchdog/manual starts from racing.
  await acquireAuthPid();

  if (authMode === 'tenant') {
    console.log('[auth] 使用应用身份模式（tenant_access_token），无需浏览器授权。');
    while (!shuttingDown) {
      try {
        const tokenData = await fetchTenantAccessToken({ clientId, clientSecret });
        await writeTokenFile(tokenPath, tokenData.access_token);
        const expiresIn = Number(tokenData.expires_in || 7200);
        const waitSeconds = Math.max(60, expiresIn - Math.max(Math.ceil(expiresIn * 0.2), 60));
        console.log(`[auth] Tenant token refreshed. Expires in ${expiresIn}s. Next refresh in ${waitSeconds}s.`);
        await sleep(waitSeconds * 1000);
      } catch (err) {
        if (shuttingDown) break;
        console.error('[auth] Tenant token error:', err.message || err);
        await sleep(30_000);
      }
    }
    return;
  }

  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => {
      server.off('error', reject);
      resolve();
    });
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
          if (result.error === 'timeout') {
            console.log('[auth] 授权超时。60秒后重试...');
            await sleep(60_000);
            lastAuthUrlLogged = false;
            continue;
          }
          console.log('[auth] 授权被拒绝。60秒后重试...');
          lastAuthUrlLogged = false;
          await sleep(60_000);
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
        if (isTokenRequestError(err)) {
          console.log('[auth] refresh_token rejected by Feishu. Will open browser for re-authorization in 5s...');
          refreshToken = null;
          lastAuthUrlLogged = false;
          await sleep(5_000);
        } else {
          console.log('[auth] Refresh request failed before Feishu rejected the token. Keeping refresh_token and retrying in 60s...');
          await sleep(60_000);
        }
      } else {
        console.log('[auth] Retrying in 10 seconds...');
        await sleep(10_000);
      }
    }
  }
}

process.on('exit', releaseAuthPid);

// Global error handlers — prevent V8/libuv assertion crashes from killing the
// auth process during token refresh or browser callback handling.
process.on('uncaughtException', (err) => {
  console.error('[auth] uncaughtException (swallowed):', err && (err.message || err));
  if (err && err.code === 'EADDRINUSE') {
    // Another auth instance likely holds :7777. Exit 0 so watchdog does not
    // spin a 3s crash loop; the existing process already covers token refresh.
    console.error('[auth] port 7777 already in use; assuming another auth is running, exiting cleanly');
    process.exit(0);
  }
});
process.on('unhandledRejection', (reason) => {
  const msg = reason && (reason.message || reason) || 'unknown';
  console.error('[auth] unhandledRejection (swallowed):', msg);
});

main().catch((err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('[auth] port 7777 already in use; assuming another auth is running, exiting cleanly');
    process.exit(0);
  }
  console.error(err.message || err);
  process.exit(1);
});

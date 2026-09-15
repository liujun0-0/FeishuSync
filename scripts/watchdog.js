import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { isTokenExpired } from '../api/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const WATCHDOG_PID = path.join(ROOT, '.feishu-sync-watchdog.pid');
// Keep the same pid files as index.js so `node index.js stop` can stop
// children started by the watchdog too.
const AUTH_PID = path.join(ROOT, '.feishu-sync-auth.pid');
const SYNC_PID = path.join(ROOT, '.feishu-sync.pid');
const PID_FOR = { auth: AUTH_PID, sync: SYNC_PID };
const LOG_DIR = path.join(ROOT, 'logs');
const AUTH_LOG = path.join(LOG_DIR, 'auth.log');
const SYNC_LOG = path.join(LOG_DIR, 'sync.log');
const WATCHDOG_LOG = path.join(LOG_DIR, 'watchdog.log');
const MAX_LOG_BYTES = 20 * 1024 * 1024;
async function rotateLog(file) {
  try { const st = await fs.stat(file); if (st.size >= MAX_LOG_BYTES) await fs.rename(file, `${file}.${Date.now()}.old`); } catch {}
}

// Children are (re)started only when they are not alive; this is the core
// "survive reboots & crashes" guarantee. auth stays up to renew the token;
// sync stays up to keep the folder mirrored.
const CHILDREN = [
  { name: 'auth', script: 'scripts/auth.js', log: AUTH_LOG, waitForToken: false },
  { name: 'sync', script: 'scripts/sync.js', log: SYNC_LOG, waitForToken: true },
];

let shuttingDown = false;
const children = new Map();
// Per-child restart backoff. Prevents auth EADDRINUSE (or rapid sync crashes)
// from spinning every 3s forever and flooding logs.
const restartAttempts = new Map();
const RESTART_BASE_MS = 3000;
const RESTART_MAX_MS = 60_000;
const RESTART_RESET_AFTER_MS = 60_000;

function nextRestartDelay(name) {
  const attempt = (restartAttempts.get(name) || 0) + 1;
  restartAttempts.set(name, attempt);
  const delay = Math.min(RESTART_MAX_MS, RESTART_BASE_MS * 2 ** Math.min(attempt - 1, 5));
  return delay;
}

function markChildHealthy(name) {
  restartAttempts.delete(name);
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  console.log(line.trimEnd());
  fs.appendFile(WATCHDOG_LOG, line, 'utf8').catch(() => {});
}

async function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPid(pidPath) {
  try {
    const raw = await fs.readFile(pidPath, 'utf8');
    const pid = Number(raw.trim());
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

async function writePid(pidPath, pid) {
  await fs.writeFile(pidPath, `${pid}\n`, 'utf8');
}

async function removePid(pidPath) {
  try {
    await fs.unlink(pidPath);
  } catch {
    // ignore
  }
}

async function tokenFileReady(tokenPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const raw = await fs.readFile(tokenPath, 'utf8');
      const token = raw.trim();
      if (token && !isTokenExpired(token)) return true;
    } catch {
      // token file not created yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function spawnChild(spec, tokenPath) {
  await rotateLog(spec.log);
  const logStream = createWriteStream(spec.log, { flags: 'a' });
  const child = spawn(process.execPath, [spec.script], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => logStream.write(d));
  child.stderr.on('data', (d) => logStream.write(d));
  children.set(spec.name, { spec, child, logStream });
  // Write the same pid files index.js uses, so `node index.js stop` works.
  writePid(PID_FOR[spec.name], child.pid).then(() => {
    log(`[${spec.name}] pid file written (${child.pid})`);
  });
  log(`[${spec.name}] started (pid ${child.pid})`);
  const startedAt = Date.now();
  const healthyTimer = setTimeout(() => markChildHealthy(spec.name), RESTART_RESET_AFTER_MS);
  healthyTimer.unref?.();

  child.on('exit', (code, signal) => {
    clearTimeout(healthyTimer);
    logStream.end();
    children.delete(spec.name);
    removePid(PID_FOR[spec.name]);
    if (shuttingDown) {
      log(`[${spec.name}] exited (code ${code}, signal ${signal}); shutdown in progress, not restarting`);
      return;
    }
    // Clean exit (e.g. auth EADDRINUSE → exit 0) — do not restart.
    if (code === 0 && !signal) {
      log(`[${spec.name}] exited cleanly (code 0); not restarting`);
      return;
    }
    // Survived long enough → treat next crash as fresh.
    if (Date.now() - startedAt >= RESTART_RESET_AFTER_MS) {
      markChildHealthy(spec.name);
    }
    const delay = nextRestartDelay(spec.name);
    log(`[${spec.name}] crashed (code ${code}, signal ${signal}); restarting in ${Math.round(delay / 1000)}s`);
    setTimeout(() => startChild(spec, tokenPath), delay);
  });
  child.on('error', (err) => {
    log(`[${spec.name}] spawn error: ${err.message || err}`);
  });
}

async function startChild(spec, tokenPath) {
  if (shuttingDown) return;
  const holder = children.get(spec.name);
  if (holder && isProcessAlive(holder.child.pid)) {
    log(`[${spec.name}] already running (pid ${holder.child.pid})`);
    return;
  }
  if (spec.waitForToken) {
    const ready = await tokenFileReady(tokenPath, 120_000);
    if (!ready) {
      log(`[${spec.name}] token file not ready after 120s; waiting 10s and retrying`);
      setTimeout(() => startChild(spec, tokenPath), 10_000);
      return;
    }
    log(`[${spec.name}] token file ready`);
  }
  spawnChild(spec, tokenPath);
}

async function start() {
  await fs.mkdir(LOG_DIR, { recursive: true });

  // Guard against double-start (e.g. watchdog launched by both the task
  // scheduler and a manual run).
  const existingPid = await readPid(WATCHDOG_PID);
  if (existingPid && (await isProcessAlive(existingPid))) {
    console.log(`[watchdog] already running (pid ${existingPid}); exiting.`);
    process.exit(0);
  }
  await writePid(WATCHDOG_PID, process.pid);
  log(`[watchdog] started (pid ${process.pid})`);

  const config = await readConfig();
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

  for (const spec of CHILDREN) {
    await startChild(spec, tokenPath);
  }

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`[watchdog] received ${signal}; stopping children`);
    for (const { spec, child } of children.values()) {
      try {
        child.kill('SIGTERM');
        log(`[${spec.name}] SIGTERM sent (pid ${child.pid})`);
      } catch (err) {
        log(`[${spec.name}] kill failed: ${err.message || err}`);
      }
    }
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));
  process.on('exit', () => {
    removePid(WATCHDOG_PID);
  });

  log('[watchdog] supervising auth & sync; use `node index.js stop` or kill the watchdog pid to stop.');
}

// Global error handlers — prevent V8/libuv assertion crashes from killing
// the watchdog. If the watchdog dies, auth and sync children become orphans
// without supervision. Log and keep running.
process.on('uncaughtException', (err) => {
  log(`[watchdog] uncaughtException (swallowed): ${err.message || err}`);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason && (reason.message || reason) || 'unknown';
  log(`[watchdog] unhandledRejection (swallowed): ${msg}`);
});

start().catch((err) => {
  console.error(`[watchdog] fatal: ${err.message || err}`);
  process.exit(1);
});

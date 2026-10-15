import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { readConfig, requireConfigValue, resolvePath } from './config.js';
import { isTokenExpired } from './api/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_PID = path.join(__dirname, '.feishu-sync-auth.pid');
const SYNC_PID = path.join(__dirname, '.feishu-sync.pid');
const WATCHDOG_PID = path.join(__dirname, '.feishu-sync-watchdog.pid');

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

async function readPid(pidPath) {
  try {
    const raw = await fs.readFile(pidPath, 'utf8');
    const pid = Number(raw.trim());
    return Number.isFinite(pid) ? pid : null;
  } catch (err) {
    return null;
  }
}

async function writePid(pidPath, pid) {
  await fs.writeFile(pidPath, `${pid}\n`, 'utf8');
}

async function removePid(pidPath) {
  try {
    await fs.unlink(pidPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') return;
    throw err;
  }
}

function spawnDetached(nodeArgs) {
  if (process.platform === 'win32') {
    // `detached: true` alone can still leave descendants attached to the
    // terminal/job object used to launch npm. The Windows `start` command
    // creates an independent process that survives the caller.
    return spawn('cmd.exe', ['/d', '/c', 'start', '""', process.execPath, ...nodeArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: process.env,
    });
  }
  const child = spawn(process.execPath, nodeArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
  return child;
}

async function waitForToken(tokenPath) {
  const intervalMs = 1000;
  for (;;) {
    try {
      const raw = await fs.readFile(tokenPath, 'utf8');
      const token = raw.trim();
      if (token && !isTokenExpired(token)) return true;
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        console.error(`[start] failed reading token file: ${err.message || err}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function start() {
  const watchdogPid = await readPid(WATCHDOG_PID);
  if (watchdogPid && isProcessAlive(watchdogPid)) {
    console.log(`[start] watchdog already running (pid ${watchdogPid})`);
    return;
  }
  if (watchdogPid) await removePid(WATCHDOG_PID);

  // The watchdog is the single owner of auth and sync. Starting those
  // children directly leaves them orphaned when one exits or the shell closes.
  const watchdogScript = path.join(__dirname, 'scripts', 'watchdog.js');
  spawnDetached([watchdogScript]);
  // The Windows `start` wrapper has its own short-lived PID; watchdog writes
  // the authoritative PID once its server is initialized.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const actualPid = await readPid(WATCHDOG_PID);
  console.log(`[start] watchdog started${actualPid ? ` (pid ${actualPid})` : ''}; it will supervise auth and sync`);
}

async function stop() {
  // If the watchdog is running, stopping it first makes it terminate its
  // children (auth & sync) cleanly; otherwise it would restart them right
  // after we kill them below.
  const watchdogPid = await readPid(path.join(__dirname, '.feishu-sync-watchdog.pid'));
  if (watchdogPid && isProcessAlive(watchdogPid)) {
    try {
      process.kill(watchdogPid, 'SIGTERM');
      console.log(`[stop] watchdog stopped (pid ${watchdogPid})`);
    } catch (err) {
      console.warn(`[stop] failed to stop watchdog (pid ${watchdogPid}): ${err.message || err}`);
    }
  }

  const authPid = await readPid(AUTH_PID);
  const syncPid = await readPid(SYNC_PID);

  if (syncPid) {
    if (isProcessAlive(syncPid)) {
      try {
        process.kill(syncPid, 'SIGTERM');
        console.log(`[stop] sync stopped (pid ${syncPid})`);
      } catch (err) {
        console.warn(`[stop] failed to stop sync (pid ${syncPid}): ${err.message || err}`);
      }
    }
    await removePid(SYNC_PID);
  } else {
    console.log('[stop] sync not running');
  }

  if (authPid) {
    if (isProcessAlive(authPid)) {
      try {
        process.kill(authPid, 'SIGTERM');
        console.log(`[stop] auth stopped (pid ${authPid})`);
      } catch (err) {
        console.warn(`[stop] failed to stop auth (pid ${authPid}): ${err.message || err}`);
      }
    }
    await removePid(AUTH_PID);
  } else {
    console.log('[stop] auth not running');
  }
}

const command = process.argv[2] || 'start';
if (command === 'start') {
  start().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
} else if (command === 'stop') {
  stop().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
} else {
  console.log('Usage: node index.js [start|stop]');
  process.exit(1);
}

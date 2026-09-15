import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import {
  resolveSyncFolder,
  startLocalWatcher,
  shouldSyncLocalPath,
  LOCAL_TO_REMOTE_DELETE_GRACE_MS,
  checkPendingDelete,
  findDocIdByFile,
  readToken,
  removeEmptyParentDirs,
} from '../api/helpers.js';
import { loadState, saveState } from '../api/sync-state.js';
import { deleteRemoteDocument } from '../api/feishu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST = '.feishu-sync.json';

const config = await readConfig();
const rootDir = resolveSyncFolder(config.sync?.folderPath || 'wikid');
const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

const state = await loadState(rootDir, MANIFEST);
const seen = new Set();
for (const [id, entry] of Object.entries(state.docs || {})) {
  if (!entry.file) continue;
  if (seen.has(entry.file)) {
    console.warn(`[local-watch] duplicate manifest path: ${entry.file} (${id})`);
  }
  seen.add(entry.file);
  const abs = path.join(rootDir, entry.file);
  const st = await fs.stat(abs).catch(() => null);
  if (!st) console.warn(`[local-watch] manifest file missing: ${entry.file}`);
  if (entry.pendingDeleteAt) console.warn(`[local-watch] pending delete: ${entry.file}`);
}

const queue = new Set();
let pumping = false;
const retries = new Map();
const workerScript = path.join(ROOT, 'scripts', 'local-upload-worker.js');

function enqueue(fileRel) {
  if (!fileRel || !shouldSyncLocalPath(fileRel, MANIFEST)) return;
  const rel = fileRel.replaceAll('\\', '/');
  queue.add(rel);
  pump();
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.size > 0) {
      const rel = queue.values().next().value;
      queue.delete(rel);
      try {
        await processOne(rel);
        retries.delete(rel);
      } catch (err) {
        console.error(`[local-watch] process failed for ${rel}: ${err.message || err}`);
        const attempt = (retries.get(rel) || 0) + 1;
        retries.set(rel, attempt);
        const delay = Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6));
        setTimeout(() => enqueue(rel), delay);
      }
    }
  } finally {
    pumping = false;
    if (queue.size > 0) pump();
  }
}

async function processOne(fileRel) {
  const abs = path.join(rootDir, fileRel);
  const exists = await fs.stat(abs).then((s) => s.isFile()).catch(() => false);
  if (!exists) {
    await handleLocalDelete(fileRel);
    return;
  }
  await runUploadWorker(abs);
}

function runUploadWorker(absPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerScript, absPath], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`upload worker exited code=${code} signal=${signal}`));
    });
  });
}

async function handleLocalDelete(fileRel) {
  const stateNow = await loadState(rootDir, MANIFEST);
  const docId = findDocIdByFile(stateNow.docs || {}, fileRel);
  if (!docId) {
    // Untracked file vanished — nothing to push to Feishu.
    return;
  }
  const entry = stateNow.docs[docId];
  const deleteState = checkPendingDelete(entry, Date.now(), LOCAL_TO_REMOTE_DELETE_GRACE_MS);
  if (deleteState === 'marked') {
    await saveState(rootDir, stateNow, MANIFEST);
    console.warn(
      `[local-watch] local file missing for ${docId} (${fileRel}); ` +
        `remote delete in ~${Math.round(LOCAL_TO_REMOTE_DELETE_GRACE_MS / 1000)}s ` +
        `(move-safe grace)`
    );
    return;
  }
  if (deleteState === 'waiting') return;
  await propagateRemoteDelete(docId, entry, stateNow);
}

async function propagateRemoteDelete(docId, entry, stateNow) {
  const token = await readToken(tokenPath);
  try {
    await deleteRemoteDocument(docId, token, entry?.fileType || 'docx');
    console.log(`[local-watch] deleted remote ${docId} (${entry?.file || entry?.title || ''})`);
  } catch (err) {
    console.error(`[local-watch] failed to delete remote ${docId}: ${err.message || err}`);
    // Keep pendingDeleteAt so the sweep can retry.
    await saveState(rootDir, stateNow, MANIFEST);
    throw err;
  }
  delete stateNow.docs[docId];
  await saveState(rootDir, stateNow, MANIFEST);
  if (entry?.file) {
    await removeEmptyParentDirs(path.dirname(path.join(rootDir, entry.file)), rootDir);
  }
}

async function sweepPendingDeletes() {
  const stateNow = await loadState(rootDir, MANIFEST);
  let dirty = false;
  for (const [docId, entry] of Object.entries(stateNow.docs || {})) {
    if (!entry?.pendingDeleteAt || !entry.file) continue;
    const abs = path.join(rootDir, entry.file);
    const exists = await fs.stat(abs).then((s) => s.isFile()).catch(() => false);
    if (exists) {
      delete entry.pendingDeleteAt;
      dirty = true;
      console.log(`[local-watch] cancelled pending delete for restored ${entry.file}`);
      continue;
    }
    const deleteState = checkPendingDelete(entry, Date.now(), LOCAL_TO_REMOTE_DELETE_GRACE_MS);
    if (deleteState === 'marked') {
      dirty = true;
      continue;
    }
    if (deleteState === 'waiting') continue;
    try {
      await propagateRemoteDelete(docId, entry, stateNow);
    } catch {
      // logged inside propagateRemoteDelete; keep going
    }
  }
  if (dirty) await saveState(rootDir, stateNow, MANIFEST);
}

startLocalWatcher(rootDir, {
  onChange: enqueue,
  localIgnoreWindowMs: 5000,
  manifestName: MANIFEST,
});

setInterval(() => {
  sweepPendingDeletes().catch((err) => {
    console.error(`[local-watch] pending-delete sweep failed: ${err.message || err}`);
  });
}, 30_000).unref?.();

// Kick once at startup for already-pending entries (e.g. leftover from earlier runs).
sweepPendingDeletes().catch(() => {});

console.log(`[local-watch] watching ${rootDir} (local delete → Feishu after ${LOCAL_TO_REMOTE_DELETE_GRACE_MS / 1000}s grace)`);

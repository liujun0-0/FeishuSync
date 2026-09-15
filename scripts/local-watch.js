import path from 'node:path';
import { spawn } from 'node:child_process';
import { readConfig } from '../config.js';
import { resolveSyncFolder, startLocalWatcher, shouldSyncLocalPath } from '../api/helpers.js';
import { loadState } from '../api/sync-state.js';

const config = await readConfig();
const rootDir = resolveSyncFolder(config.sync?.folderPath || 'wikid');
const state = await loadState(rootDir, '.feishu-sync.json');
const seen = new Set();
for (const [id, entry] of Object.entries(state.docs || {})) {
  if (!entry.file) continue;
  if (seen.has(entry.file)) console.warn(`[local-watch] duplicate manifest path: ${entry.file} (${id})`);
  seen.add(entry.file);
  if (!await import('node:fs/promises').then(fs => fs.stat(path.join(rootDir, entry.file)).catch(() => null))) {
    console.warn(`[local-watch] manifest file missing: ${entry.file}`);
  }
  if (entry.pendingDeleteAt) console.warn(`[local-watch] pending delete: ${entry.file}`);
}
let running = false;
let queued = null;
const retries = new Map();

function run(fileRel) {
  if (!fileRel || !shouldSyncLocalPath(fileRel, '.feishu-sync.json')) return;
  const abs = path.join(rootDir, fileRel);
  if (running) { queued = abs; return; }
  running = true;
  const child = spawn(process.execPath, [path.join(process.cwd(), 'scripts', 'local-upload-worker.js'), abs], { stdio: 'inherit', windowsHide: true });
  child.on('exit', (code) => { running = false; if (code !== 0) { const attempt=(retries.get(abs)||0)+1; retries.set(abs,attempt); const delay=Math.min(60000,1000*2**Math.min(attempt,6)); setTimeout(()=>run(path.relative(rootDir,abs).replaceAll('\\','/')),delay); return; } retries.delete(abs); if (queued) { const next = queued; queued = null; run(path.relative(rootDir, next).replaceAll('\\', '/')); } });
}

startLocalWatcher(rootDir, { onChange: run, localIgnoreWindowMs: 5000, manifestName: '.feishu-sync.json' });
console.log(`[local-watch] watching ${rootDir}`);

import path from 'node:path';
import { spawn } from 'node:child_process';
import { readConfig, resolveSyncFolder, startLocalWatcher, shouldSyncLocalPath } from '../api/helpers.js';

const config = await readConfig();
const rootDir = resolveSyncFolder(config.sync?.folderPath || 'wikid');
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

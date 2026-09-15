import fs from 'node:fs/promises';
import path from 'node:path';
const root='wikid';
const manifest=JSON.parse(await fs.readFile(path.join(root,'.feishu-sync.json'),'utf8').catch(()=>'{"docs":{}}'));
const queue=JSON.parse(await fs.readFile(path.join(root,'.feishu-sync-events.json'),'utf8').catch(()=>'{"remote":[],"local":[]}'));
const conflicts=Object.entries(manifest.docs||{}).filter(([,e])=>e.lastConflict).length;
const pending=Object.entries(manifest.docs||{}).filter(([,e])=>e.pendingDeleteAt).length;
console.log(JSON.stringify({documents:Object.keys(manifest.docs||{}).length,queuedRemote:(queue.remote||[]).length,queuedLocal:(queue.local||[]).length,pendingDelete:pending,conflicts},null,2));

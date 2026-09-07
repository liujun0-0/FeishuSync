// 清理所有 -N 后缀 stub 和 import-* 测试残留（一次性）
import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { deleteRemoteDocument } from '../api/feishu.js';

const config = await readConfig();
const token = await readToken(resolvePath(requireConfigValue(config, 'tokenPath')));

async function* walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* walk(full);
    else if (item.name.endsWith('.md') && (/-\d+\.md$/.test(item.name) || item.name.startsWith('import-'))) {
      yield full;
    }
  }
}

const WIKID = 'wikid';
const m = JSON.parse(await fs.readFile(`${WIKID}/.feishu-sync.json`, 'utf8'));
let cleaned = 0;
const removed = [];

for await (const file of walk(WIKID)) {
  const rel = file.replace(/\\/g, '/').replace(`${WIKID}/`, '');
  const idx = Object.entries(m.docs).findIndex(([, e]) => e.file && e.file.replace(/\\/g, '/') === rel);
  const entry = idx >= 0 ? Object.entries(m.docs)[idx] : null;
  const docId = entry ? entry[0] : null;
  console.log(`${rel}  ${docId ? 'tracked:' + docId.slice(0,10) + '...' : 'untracked'}`);
  await fs.unlink(file).catch(() => {});
  if (docId) {
    try { await deleteRemoteDocument(docId, token, 'docx'); } catch {}
    delete m.docs[docId];
    removed.push(docId);
  }
  cleaned++;
}

m.updatedAt = new Date().toISOString();
await fs.writeFile(`${WIKID}/.feishu-sync.json`, JSON.stringify(m, null, 2) + '\n');
console.log(`\n清理 ${cleaned} 个文件`);
console.log(`manifest 移除 ${removed.length} 个条目`);

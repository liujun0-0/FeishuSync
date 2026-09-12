// 验证最终状态
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, fetchAllBlocks } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

console.log('=== 飞书 wiki 结构 ===');
const all = [];
async function walk(pt, depth) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push({ ...n, depth });
    if (n.has_child && (n.node_token || n.nodeToken)) {
      await walk(n.node_token || n.nodeToken, depth + 1);
    }
  }
}
await walk(undefined, 0);
console.log(`总节点: ${all.length}`);

// 找 WhatsApp-BSP-API 相关
const bsp = all.filter(n => (n.title || '').includes('WhatsApp-BSP-API'));
console.log(`\nWhatsApp-BSP-API 相关节点 (${bsp.length}):`);
for (const n of bsp) {
  console.log(`  [depth=${n.depth}] "${n.title}" docId=${n.obj_token?.slice(0,12)} has_child=${n.has_child}`);
  if (n.has_child) {
    const children = await fetchWikiNodes(spaceId, token, n.node_token);
    for (const c of children) {
      console.log(`    └─ "${c.title}" docId=${c.obj_token?.slice(0,12)}`);
    }
  }
}

console.log('\n=== 本地文件 ===');
const dir = path.join('wikid', '飞书深诺文档集合', '飞书深诺技术文档');
for (const f of await fs.readdir(dir)) {
  if (f.includes('WhatsApp-BSP-API')) {
    const stat = await fs.stat(path.join(dir, f));
    console.log(`  ${f} (${stat.size}B)${stat.isDirectory() ? ' [DIR]' : ''}`);
  }
}
const subdir = path.join(dir, 'WhatsApp-BSP-API开放评估');
try {
  for (const f of await fs.readdir(subdir)) {
    const stat = await fs.stat(path.join(subdir, f));
    console.log(`  WhatsApp-BSP-API开放评估/${f} (${stat.size}B)`);
  }
} catch {}

console.log('\n=== manifest BSP 条目 ===');
const m = JSON.parse(await fs.readFile('wikid/.feishu-sync.json', 'utf8'));
for (const [k, e] of Object.entries(m.docs)) {
  if (e.file?.includes('WhatsApp-BSP') || e.title?.includes('WhatsApp-BSP')) {
    console.log(`  ${k}: ${e.title}`);
    console.log(`    file: ${e.file}`);
  }
}
console.log(`\nmanifest 总条目: ${Object.keys(m.docs).length}`);

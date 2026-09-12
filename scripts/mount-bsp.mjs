// 手动挂载 BSP doc 到容器
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, addDocToWiki, moveWikiNode, fetchWikiNodes, apiGet } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const DOC_ID = 'CZZqdWirPor31px4MC7cio5YnFb';

// 查 BSP doc 的 node
console.log('=== 查 BSP doc 的 wiki node ===');
let bspNode = null;
try {
  const info = await apiGet('/wiki/v2/spaces/get_node', token, { token: DOC_ID });
  bspNode = info?.node;
  console.log('  找到 node:', bspNode?.node_token?.slice(0, 15));
} catch (e) {
  console.log('  找不到 node:', e.message.slice(0, 80));
}

// 找容器
console.log('\n=== 找容器 ===');
const all = [];
async function walk(parentToken) {
  for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);
const parent = all.find(n => n.title === 'WhatsApp-BSP-API开放评估');
console.log('  容器:', parent?.title, parent?.node_token?.slice(0, 15));

if (bspNode && parent) {
  const bspToken = bspNode.node_token || bspNode.nodeToken;
  const parentToken = parent.node_token || parent.nodeToken;
  try {
    await moveWikiNode(spaceId, token, bspToken, parentToken);
    console.log('  ✅ 已挂载');
  } catch (e) {
    console.log('  挂载失败:', e.message.slice(0, 80));
  }
}

// 更新 manifest revisionId
const { createHash } = await import('node:crypto');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
if (m.docs[DOC_ID]) {
  m.docs[DOC_ID].revisionId = 1; // 刚上传完应该是 rev 1
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('\nmanifest 已更新');

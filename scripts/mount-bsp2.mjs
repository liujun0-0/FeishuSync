// 完整挂载 BSP doc 到容器
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
const PARENT_TITLE = 'WhatsApp-BSP-API开放评估';

// 1. addDocToWiki 创建 wiki node（不指定 parent → 挂到空间根）
console.log('=== 1. addDocToWiki ===');
try {
  await addDocToWiki(spaceId, token, DOC_ID);
  console.log('  ✅ 挂载到空间根');
} catch (e) {
  console.log('  失败:', e.message.slice(0, 80));
}

// 等 3 秒让飞书索引
await new Promise(r => setTimeout(r, 3000));

// 2. 找 doc 的 wiki node
console.log('\n=== 2. 找 doc 的 wiki node ===');
let bspNodeToken = null;
try {
  const info = await apiGet('/wiki/v2/spaces/get_node', token, { token: DOC_ID });
  bspNodeToken = info?.node?.node_token;
  console.log('  找到:', bspNodeToken?.slice(0, 15));
} catch (e) {
  console.log('  get_node 失败:', e.message.slice(0, 80));
}

// 如果 get_node 还不行，遍历树找
if (!bspNodeToken) {
  console.log('  遍历树查找...');
  const all = [];
  async function walk(parentToken) {
    for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
      all.push(n);
      if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
    }
  }
  await walk(undefined);
  const found = all.find(n => n.documentId === DOC_ID);
  if (found) {
    bspNodeToken = found.node_token || found.nodeToken;
    console.log('  找到:', bspNodeToken?.slice(0, 15));
  }
}

// 3. 找容器
console.log('\n=== 3. 找容器 ===');
const all = [];
async function walk(parentToken) {
  for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);
const parent = all.find(n => n.title === PARENT_TITLE);
if (parent) console.log('  容器:', parent.title, parent.node_token?.slice(0, 15));

// 4. 移动
if (bspNodeToken && parent) {
  console.log('\n=== 4. 移动到容器 ===');
  try {
    await moveWikiNode(spaceId, token, bspNodeToken, parent.node_token || parent.nodeToken);
    console.log('  ✅ 已挂到', PARENT_TITLE);
  } catch (e) {
    console.log('  失败:', e.message.slice(0, 100));
  }
}

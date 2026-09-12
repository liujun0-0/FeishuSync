// 找 BSP doc 的真实 docId
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, apiGet } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

// 直接用 apiGet 获取空间所有节点
console.log('=== 列出空间所有节点 ===');
const allNodes = [];
let pageToken;
do {
  const r = await apiGet('/wiki/v2/spaces/' + await (await import('../api/feishu.js')).resolveSpaceId(spaceId, token) + '/nodes', token, { page_size: 50, page_token: pageToken });
  for (const item of r.items || []) {
    allNodes.push(item);
  }
  pageToken = r.page_token;
} while (pageToken);

console.log(`总节点数: ${allNodes.length}`);

// 找 BSP 相关
const bspNodes = allNodes.filter(n => n.title?.includes('BSP') || n.title?.includes('WhatsApp'));
console.log(`\nBSP 相关节点:`);
for (const n of bspNodes) {
  console.log(`  标题: ${n.title}`);
  console.log(`    obj_token: ${n.obj_token}`);
  console.log(`    node_token: ${n.node_token}`);
  console.log(`    has_child: ${n.has_child}`);
  console.log('');
}

// 遍历飞书树找 BSP doc
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, moveWikiNode } from '../api/feishu.js';
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

// 深度遍历树
const all = [];
async function walk(parentToken, depth) {
  for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
    all.push({...n, depth});
    if (n.has_child && (n.node_token || n.nodeToken)) {
      await walk(n.node_token || n.nodeToken, depth + 1);
    }
  }
}
await walk(undefined, 0);

console.log(`总节点数: ${all.length}`);
// 找 BSP 相关
const bspNodes = all.filter(n => n.title?.includes('BSP') || n.documentId === DOC_ID);
console.log(`BSP 相关: ${bspNodes.length} 个`);
for (const n of bspNodes) {
  console.log(`  [${n.depth}] ${n.title} docId=${n.documentId} nodeToken=${(n.node_token || n.nodeToken)?.slice(0,12)}`);
}

// 找容器
const parent = all.find(n => n.title === PARENT_TITLE);
if (parent) {
  console.log(`\n容器: ${parent.title} nodeToken=${(parent.node_token || parent.nodeToken)?.slice(0,12)}`);
}

// 找 BSP 的 node
const bspNode = all.find(n => n.documentId === DOC_ID);
if (bspNode) {
  const bspNodeToken = bspNode.node_token || bspNode.nodeToken;
  const parentToken = parent.node_token || parent.nodeToken;
  console.log(`\nBSP node: ${bspNodeToken?.slice(0,15)}`);
  console.log(`移动到容器: ${parentToken?.slice(0,15)}`);
  try {
    await moveWikiNode(spaceId, token, bspNodeToken, parentToken);
    console.log('  ✅ 成功');
    
    // 更新 manifest
    const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
    if (m.docs[DOC_ID]) {
      m.docs[DOC_ID].revisionId = 1;
      m.updatedAt = new Date().toISOString();
      await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
      console.log('  manifest 已更新');
    }
  } catch (e) {
    console.log('  失败:', e.message.slice(0, 100));
  }
} else {
  console.log('\nBSP doc 不在树里（addDocToWiki 可能还没生效）');
}

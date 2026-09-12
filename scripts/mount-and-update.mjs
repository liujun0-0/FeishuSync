// 挂 BSP doc 到容器 + 更新 manifest
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, addDocToWiki, moveWikiNode, fetchWikiNodes, fetchAllBlocks } from '../api/feishu.js';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');
const BSP_FILE_REL = '飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const BSP_FILE_ABS = path.join(ROOT, 'wikid', BSP_FILE_REL);
const DOC_ID = 'AuUTdtRJhoMLmCxuyvnclkYensg';
const PARENT_TITLE = 'WhatsApp-BSP-API开放评估';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

console.log('=== 1. addDocToWiki ===');
try {
  await addDocToWiki(spaceId, token, DOC_ID);
  console.log('  ✅ 挂载到空间根');
} catch (e) {
  console.log('  ⚠️ ' + e.message.slice(0, 80));
}

await new Promise(r => setTimeout(r, 3000));

console.log('\n=== 2. 找容器 node ===');
const all = [];
async function walk(pt) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);

const bspNode = all.find(n => n.documentId === DOC_ID);
const parent = all.find(n => n.title === PARENT_TITLE);

console.log(`  BSP node: ${bspNode?.node_token?.slice(0,15) || 'NOT FOUND'}`);
console.log(`  容器 node: ${parent?.node_token?.slice(0,15) || 'NOT FOUND'}`);

if (bspNode && parent) {
  const bspToken = bspNode.node_token || bspNode.nodeToken;
  const parentToken = parent.node_token || parent.nodeToken;
  try {
    await moveWikiNode(spaceId, token, bspToken, parentToken);
    console.log('  ✅ 已挂到容器');
  } catch (e) {
    console.log('  ⚠️ move 失败: ' + e.message.slice(0, 100));
  }
} else {
  console.log('  ⚠️ 找不到 node 或容器，需要手动拖');
}

console.log('\n=== 3. 更新 manifest ===');
const content = await fs.readFile(BSP_FILE_ABS, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
for (const [k, e] of Object.entries(m.docs)) {
  if (e.file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    delete m.docs[k];
    console.log('  删旧: ' + k);
  }
}
m.docs[DOC_ID] = {
  file: BSP_FILE_REL,
  revisionId: 1,
  title: 'WhatsApp Cloud API BSP 开放现状评估报告',
  fileType: 'docx',
  hash,
};
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`  新 docId: ${DOC_ID}`);
console.log(`  hash: ${hash.slice(0,12)}`);
console.log(`  manifest: ${Object.keys(m.docs).length} 条目`);

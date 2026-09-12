// 1. 创建 BSP 文档并上传内容
// 2. 挂到容器
// 3. 更新 manifest
import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, createDocument, uploadMarkdownToDocument, addDocToWiki, moveWikiNode, fetchWikiNodes, fetchAllBlocks, deleteRemoteDocument } from '../api/feishu.js';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');
const BSP_FILE_REL = '飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const BSP_FILE_ABS = path.join(ROOT, 'wikid', BSP_FILE_REL);
const BSP_TITLE = 'WhatsApp Cloud API BSP 开放现状评估报告';
const PARENT_TITLE = 'WhatsApp-BSP-API开放评估';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

// 1. 读 BSP 文件
console.log('=== 1. 读 BSP 文件 ===');
const content = await fs.readFile(BSP_FILE_ABS, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
console.log(`  大小: ${content.length}B, hash: ${hash.slice(0,12)}`);

// 2. 查飞书里是否还有同名 doc（之前的 CZZqdWirPor31px4MC7cio5YnFb 已被删了）
console.log('\n=== 2. 查飞书 BSP 文档 ===');
const all = [];
async function walk(pt) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);
const existing = all.find(n => n.title === BSP_TITLE);
if (existing) {
  console.log(`  飞书已有同名 doc: ${existing.documentId}`);
} else {
  console.log('  飞书无同名 doc（之前的已被删）');
}

// 3. 创建新 doc
console.log('\n=== 3. 创建 BSP doc ===');
const { documentId: newDocId } = await createDocument(token, BSP_TITLE);
console.log(`  新 docId: ${newDocId}`);

console.log('\n=== 4. 上传 BSP 内容 ===');
await uploadMarkdownToDocument(newDocId, token, content);
const newBlocks = await fetchAllBlocks(newDocId, token);
console.log(`  上传完成: ${newBlocks.length} blocks`);
const b40 = newBlocks.filter(b => b.block_type === 40);
console.log(`  block_type=40 (画板): ${b40.length}`);

// 5. 挂到容器
console.log('\n=== 5. 挂到容器 ===');
try {
  await addDocToWiki(spaceId, token, newDocId);
  await new Promise(r => setTimeout(r, 3000));
  // 找容器 node
  const all2 = [];
  async function walk2(pt) {
    for (const n of await fetchWikiNodes(spaceId, token, pt)) {
      all2.push(n);
      if (n.has_child && (n.node_token || n.nodeToken)) await walk2(n.node_token || n.nodeToken);
    }
  }
  await walk2(undefined);
  const newNode = all2.find(n => n.documentId === newDocId);
  const parent = all2.find(n => n.title === PARENT_TITLE);
  if (newNode && parent) {
    const newNodeToken = newNode.node_token || newNode.nodeToken;
    const parentToken = parent.node_token || parent.nodeToken;
    try {
      await moveWikiNode(spaceId, token, newNodeToken, parentToken);
      console.log(`  ✅ 已挂到: ${PARENT_TITLE}`);
    } catch (e) {
      console.log(`  ⚠️ move 失败: ${e.message.slice(0,100)}`);
      console.log('  doc 已在空间根，需要手动拖到容器');
    }
  } else {
    console.log(`  ⚠️ 找不到 node 或容器: newNode=${!!newNode}, parent=${!!parent}`);
  }
} catch (e) {
  console.log(`  挂载失败: ${e.message.slice(0, 100)}`);
}

// 6. 更新 manifest
console.log('\n=== 6. 更新 manifest ===');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
// 删旧 BSP 条目
for (const [k, e] of Object.entries(m.docs)) {
  if (e.file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    delete m.docs[k];
    console.log(`  删旧条目: ${k}`);
  }
}
// 加新条目
m.docs[newDocId] = {
  file: BSP_FILE_REL,
  revisionId: newBlocks.length > 0 ? 1 : 0,
  title: BSP_TITLE,
  fileType: 'docx',
  hash,
};
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`  新 docId: ${newDocId}`);
console.log(`  manifest 已更新，共 ${Object.keys(m.docs).length} 条目`);

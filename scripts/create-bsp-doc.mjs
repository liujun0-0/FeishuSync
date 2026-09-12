// 1. 在飞书创建 BSP 文档 → 2. 上传 BSP 报告内容 → 3. 更新 manifest
import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, createDocument, uploadMarkdownToDocument, addDocToWiki, moveWikiNode, fetchWikiNodes, apiGet } from '../api/feishu.js';

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

console.log('=== 1. 读 BSP 本地文件 ===');
const content = await fs.readFile(BSP_FILE_ABS, 'utf8');
console.log(`  大小: ${content.length} bytes`);

console.log('\n=== 2. 查飞书里是否已有同名 doc ===');
// 遍历飞书树找匹配
async function findDoc(spaceId, token, title) {
  const all = [];
  async function walk(parentToken) {
    for (const n of await (await import('../api/feishu.js')).fetchWikiNodes(spaceId, token, parentToken)) {
      all.push(n);
      if (n.has_child && (n.node_token || n.nodeToken)) {
        await walk(n.node_token || n.nodeToken);
      }
    }
  }
  await walk(undefined);
  return all.find(n => n.title === title);
}

const existing = await findDoc(spaceId, token, BSP_TITLE);
if (existing) {
  console.log(`  飞书已有同名 doc: ${existing.documentId}`);
  console.log('  上传内容到现有 doc...');
  await uploadMarkdownToDocument(existing.documentId, token, content);
  var docId = existing.documentId;
} else {
  console.log('  飞书无同名 doc，创建新 doc...');
  const { documentId } = await createDocument(token, BSP_TITLE);
  docId = documentId;
  console.log(`  新 doc: ${docId}`);
  console.log('  上传内容...');
  await uploadMarkdownToDocument(docId, token, content);
}

console.log('\n=== 3. 挂载到容器（WhatsApp-BSP-API开放评估）===');
try {
  await addDocToWiki(spaceId, token, docId);
  await new Promise(r => setTimeout(r, 2000));
  // 找容器 node
  const all = [];
  async function walk(parentToken) {
    for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
      all.push(n);
      if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
    }
  }
  await walk(undefined);
  const parent = all.find(n => n.title === PARENT_TITLE);
  if (parent) {
    const parentToken = parent.node_token || parent.nodeToken;
    // 找 BSP doc 的 node
    const bspNode = all.find(n => n.documentId === docId);
    if (bspNode) {
      const bspNodeToken = bspNode.node_token || bspNode.nodeToken;
      await moveWikiNode(spaceId, token, bspNodeToken, parentToken);
      console.log('  ✅ 已挂到容器:', PARENT_TITLE);
    } else {
      console.log('  ⚠️ 找不到 BSP doc 的 wiki node');
    }
  } else {
    console.log('  ⚠️ 找不到容器:', PARENT_TITLE);
  }
} catch (err) {
  console.log('  挂载失败:', err.message.slice(0, 80));
}

console.log('\n=== 4. 更新 manifest ===');
const { createHash } = await import('node:crypto');
const hash = createHash('sha256').update(content).digest('hex');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
// 删除旧 BSP_RESTORED 条目
delete m.docs['BSP_RESTORED'];
// 创建新条目用真 docId
m.docs[docId] = {
  file: BSP_FILE_REL,
  revisionId: 0,
  title: BSP_TITLE,
  fileType: 'docx',
  hash,
};
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`  manifest BSP 条目更新: docId=${docId}, hash=${hash.slice(0,12)}`);
console.log(`  条目数: ${Object.keys(m.docs).length}`);

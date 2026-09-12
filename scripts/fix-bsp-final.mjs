import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, apiGet, apiPost, addDocToWiki, fetchWikiNodes } from '../api/feishu.js';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

// 方案：不再 move，直接创建新 doc 并用 parentWikiToken 挂到容器
// 旧 doc 的内容会被 sync 处理（hash 不匹配时上传）
// 新 doc 直接挂到容器里
console.log('=== 创建 BSP doc 并挂到容器 ===');
const BSP_FILE = 'wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const content = await fs.readFile(path.join(process.cwd(), BSP_FILE), 'utf8');
const hash = require('node:crypto').createHash('sha256').update(content).digest('hex');

// 找容器的 nodeToken
const all = [];
async function walk(pt) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);
const parent = all.find(n => n.title === 'WhatsApp-BSP-API开放评估');
if (!parent) { console.log('找不到容器'); process.exit(1); }
const parentToken = parent.node_token || parent.nodeToken;
console.log('容器 nodeToken:', parentToken);

// 创建新 doc 并直接挂到容器
const { createDocument, uploadMarkdownToDocument } = await import('../api/feishu.js');
const { documentId: newDocId } = await createDocument(token, 'WhatsApp Cloud API BSP 开放现状评估报告');
console.log('新 doc:', newDocId);

await uploadMarkdownToDocument(newDocId, token, content);
console.log('内容已上传');

// 挂到容器（parentWikiToken）
await addDocToWiki(spaceId, token, newDocId, parentToken);
console.log('已挂到容器');

// 更新 manifest
const MANIFEST = path.join(process.cwd(), 'wikid/.feishu-sync.json');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
// 删旧 BSP 条目
for (const k of Object.keys(m.docs)) {
  if (m.docs[k]?.file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    delete m.docs[k];
  }
}
m.docs[newDocId] = {
  file: '飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md',
  revisionId: 1,
  title: 'WhatsApp Cloud API BSP 开放现状评估报告',
  fileType: 'docx',
  hash,
};
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('manifest 已更新，docId:', newDocId);

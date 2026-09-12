// 1. 保留一个 WhatsApp-BSP-API开放评估 作为容器，删除重复
// 2. 把 BSP 报告挂到容器下
// 3. 清理本地 -N stub 文件
// 4. 更新 manifest
import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, deleteRemoteDocument, moveWikiNode, fetchWikiNodes, fetchAllBlocks, apiGet } from '../api/feishu.js';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const WIKID = path.join(ROOT, 'wikid');
const MANIFEST = path.join(WIKID, '.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

// 已知的两个重复文档
const KEEP_DOC = 'MgwedWdEXoI8gdxGsLKcHh0Mnxg';      // 保留作为容器
const KEEP_NODE = 'UBsDwaAjiiVz0HkNyywcjAL5ncf';
const DEL_DOC = 'Ivowd2VmroSDplxuDmWcCjwznzc';       // 删除重复
const BSP_DOC = 'AuUTdtRJhoMLmCxuyvnclkYensg';       // BSP 评估报告

console.log('=== 1. 删除重复的 WhatsApp-BSP-API开放评估 文档 ===');
try {
  await deleteRemoteDocument(DEL_DOC, token, 'docx');
  console.log(`  ✅ 已删除重复文档 ${DEL_DOC}`);
} catch (e) {
  console.log(`  ⚠️ 删除失败: ${e.message.slice(0, 80)}`);
}

console.log('\n=== 2. 把 BSP 报告挂到容器下 ===');
// 找 BSP 报告的 node
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

const bspNode = all.find(n => n.obj_token === BSP_DOC);
console.log(`  BSP node: ${bspNode ? (bspNode.node_token || bspNode.nodeToken) : 'NOT FOUND'}`);
console.log(`  容器 node: ${KEEP_NODE}`);

if (bspNode) {
  const bspNodeToken = bspNode.node_token || bspNode.nodeToken;
  try {
    await moveWikiNode(spaceId, token, bspNodeToken, KEEP_NODE);
    console.log('  ✅ 已移到容器下');
  } catch (e) {
    console.log(`  ⚠️ move 失败: ${e.message.slice(0, 100)}`);
  }
} else {
  console.log('  BSP 报告的 wiki node 不存在，需要先 addDocToWiki');
}

console.log('\n=== 3. 清理本地 -N stub 文件 ===');
const dir = path.join(WIKID, '飞书深诺文档集合', '飞书深诺技术文档');
const files = await fs.readdir(dir);
let deleted = 0;
for (const f of files) {
  if (/^WhatsApp-BSP-API开放评估(-\d+)?\.md$/.test(f)) {
    const fp = path.join(dir, f);
    const stat = await fs.stat(fp);
    if (stat.size < 100) {  // 只删 stub（35B）
      await fs.unlink(fp);
      console.log(`  删除 stub: ${f} (${stat.size}B)`);
      deleted++;
    }
  }
}
console.log(`  共删除 ${deleted} 个 stub`);

console.log('\n=== 4. 更新 manifest ===');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
// 删除所有 WhatsApp-BSP-API开放评估 相关的错误条目（-N stub）
let removedEntries = 0;
for (const k of Object.keys(m.docs)) {
  const f = m.docs[k]?.file || '';
  // 删除 -N.md 形式的条目（重复 stub）
  if (/WhatsApp-BSP-API开放评估-\d+\.md$/.test(f)) {
    delete m.docs[k];
    removedEntries++;
  }
  // 删除已删除的重复文档
  if (k === DEL_DOC) {
    delete m.docs[k];
    removedEntries++;
  }
}
console.log(`  删除 ${removedEntries} 个错误条目`);

// 更新 BSP 报告的 hash
const bspFile = path.join(WIKID, '飞书深诺文档集合', '飞书深诺技术文档', 'WhatsApp-BSP-API开放评估', 'WhatsApp-BSP-API开放现状评估报告.md');
const content = await fs.readFile(bspFile, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
for (const k of Object.keys(m.docs)) {
  if (m.docs[k].file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    m.docs[k].hash = hash;
  }
}

m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`  manifest: ${Object.keys(m.docs).length} 条目`);
console.log(`  BSP hash: ${hash.slice(0, 12)}`);

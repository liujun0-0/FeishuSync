// 直接查飞书 BSP 文档状态
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchAllBlocks, apiGet } from '../api/feishu.js';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));

const MANIFEST = 'wikid/.feishu-sync.json';
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));

// 找 BSP 条目
const bspEntry = Object.entries(m.docs).find(([k, e]) =>
  e.file?.includes('WhatsApp-BSP-API开放现状评估报告')
);
if (!bspEntry) {
  console.log('manifest 中没有 BSP 条目');
  process.exit(0);
}
const [docId, entry] = bspEntry;
console.log(`BSP docId: ${docId}`);
console.log(`BSP file: ${entry.file}`);
console.log(`BSP title: ${entry.title}`);
console.log(`BSP manifest hash: ${entry.hash?.slice(0,12)}`);

// 本地文件 hash
const content = await fs.readFile('wikid/' + entry.file, 'utf8');
const localHash = createHash('sha256').update(content).digest('hex');
console.log(`BSP local hash: ${localHash.slice(0,12)}`);
console.log(`Hash match: ${entry.hash === localHash ? '✅' : '❌'}`);

// 飞书侧 blocks
try {
  const blocks = await fetchAllBlocks(docId, token);
  console.log(`\n飞书侧 blocks: ${blocks.length}`);
  const board = blocks.filter(b => b.block_type === 40);
  const code = blocks.filter(b => b.block_type === 14);
  console.log(`  block_type=40 (画板): ${board.length}`);
  console.log(`  block_type=14 (代码块): ${code.length}`);
  if (blocks.length <= 5) {
    for (const b of blocks) {
      const t = b.block_type;
      if (t === 1) console.log(`  [1 page]`, b.page?.elements?.[0]?.text_run?.content?.slice(0,60));
      else if (t === 2 || t === 3) console.log(`  [${t}]`, (b[t]?.elements || []).map(e => e.text_run?.content).join('').slice(0,60));
    }
  }
} catch (e) {
  console.log(`飞书侧获取失败: ${e.message.slice(0,80)}`);
}

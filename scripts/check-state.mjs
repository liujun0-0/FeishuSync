import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const MANIFEST = 'wikid/.feishu-sync.json';
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));

// 找 BSP 条目
const bspEntries = Object.entries(m.docs).filter(([k, e]) => {
  const f = (e.file || '').toLowerCase();
  return f.includes('bsp') || (e.title || '').toLowerCase().includes('bsp');
});

console.log('BSP manifest 条目:');
for (const [k, e] of bspEntries) {
  console.log(`  ${k}: ${e.title}`);
  console.log(`    file: ${e.file}`);
  console.log(`    hash: ${e.hash?.slice(0,12)}`);
}

// 本地文件
const content = await fs.readFile('wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md', 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
console.log(`\n本地文件 hash: ${hash.slice(0,12)} (size: ${content.length})`);

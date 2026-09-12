// 验证 BSP 文件是否在 manifest 中正确跟踪
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const MANIFEST = 'wikid/.feishu-sync.json';
const BSP_FILE = 'wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';

const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));

// 找 BSP 条目
const bspEntries = Object.entries(m.docs).filter(([k, e]) => {
  const f = (e.file || '').toLowerCase();
  return f.includes('bsp') || f.includes('评估报告') || f.includes('BSP');
});

console.log('BSP manifest 条目:');
for (const [docId, e] of bspEntries) {
  console.log(`  ${docId}: ${e.file} (title: ${e.title})`);
}

// 检查本地文件
const content = await fs.readFile(BSP_FILE, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
console.log(`\n本地文件: ${BSP_FILE}`);
console.log(`  大小: ${Buffer.byteLength(content)} bytes`);
console.log(`  hash: ${hash.slice(0, 12)}`);

// 匹配检查
const matched = bspEntries.find(([k, e]) => e.file?.includes('WhatsApp-BSP-API开放现状评估报告'));
if (matched) {
  console.log(`  manifest hash: ${matched[1].hash?.slice(0, 12)}`);
  console.log(`  匹配: ${matched[1].hash === hash ? '✅' : '❌ hash 不匹配'}`);
} else {
  console.log('  ❌ manifest 中无对应条目');
}

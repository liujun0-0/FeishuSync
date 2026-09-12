import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const MANIFEST = 'wikid/.feishu-sync.json';
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
const content = await fs.readFile('wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md', 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
if (m.docs['BSP_RESTORED']) {
  m.docs['BSP_RESTORED'].hash = hash;
  console.log('BSP hash 更新:', hash.slice(0, 12));
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');

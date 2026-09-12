import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BSP = 'wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const MANIFEST = 'wikid/.feishu-sync.json';

const content = await fs.readFile(BSP, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
for (const [k, e] of Object.entries(m.docs)) {
  if (e.file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    e.hash = hash;
    console.log('hash updated:', hash.slice(0, 12));
  }
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('manifest saved');

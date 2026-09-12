import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const m = JSON.parse(await fs.readFile('wikid/.feishu-sync.json', 'utf8'));
const bsp = Object.entries(m.docs).filter(([k, e]) => (e.file || '').includes('BSP'));
for (const [k, e] of bsp) console.log(k, e.file, 'hash=' + (e.hash?.slice(0,12)));
const content = await fs.readFile('wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md', 'utf8');
console.log('本地 hash:', createHash('sha256').update(content).digest('hex').slice(0, 12));

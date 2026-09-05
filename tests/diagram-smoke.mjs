// tests/diagram-smoke.mjs — Batch 1 冒烟测试（跑完即删，不入 git）
import { markdownToBlocks, createMermaidHash, createCodeBlockPayload } from '../api/feishu-md.js';
import { renderMermaidToPng } from '../api/mermaid-render.js';

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`[PASS] ${name}`); }
  else { fail += 1; console.error(`[FAIL] ${name} ${extra}`); }
};

// 1. 非 mermaid 代码块行为不变
const md1 = '# T\n\n```js\nconst a = 1;\n```\n';
const r1 = markdownToBlocks(md1);
const codeBlock1 = r1.blocks.find((b) => b.block_type === 14);
check('非 mermaid 代码块仍为 code block', !!codeBlock1 && !codeBlock1._mermaid);

// 2. mermaid 代码块 → image 占位块
const mermaidSrc = 'flowchart LR\n  A[Meta 平台] --> B[终端用户]\n  B -->|消息| C((core))';
const md2 = `# T\n\n\`\`\`mermaid\n${mermaidSrc}\n\`\`\`\n`;
const r2 = markdownToBlocks(md2);
const placeholder = r2.blocks.find((b) => b._mermaid !== undefined);
check('mermaid → image 占位块', !!placeholder);
check('占位块 block_type=27 (image)', placeholder && placeholder.block_type === 27);
check('占位块 token=__MERMAID_PNG__', placeholder && placeholder.image.token === '__MERMAID_PNG__');
check('占位块携带源码', placeholder && placeholder._mermaid === mermaidSrc);
check('占位块携带 hash', placeholder && placeholder._mermaidHash === createMermaidHash(mermaidSrc));

// 3. hash 稳定性
check('hash 稳定', createMermaidHash(mermaidSrc) === createMermaidHash(mermaidSrc));
check('hash 对内容敏感', createMermaidHash('a') !== createMermaidHash('b'));

// 4. 降级 code block 结构与 fenced code 一致
const fb = createCodeBlockPayload(mermaidSrc);
check('降级块为 code block', fb.block_type === 14);
check('降级块内容完整', JSON.stringify(fb).includes('flowchart LR'));

// 5. 真实渲染（B 方案核心）
const t0 = Date.now();
const png = await renderMermaidToPng(mermaidSrc);
check('PNG 渲染成功', Buffer.isBuffer(png) && png.length > 500, `len=${png && png.length}`);
console.log(`       render ${png.length} bytes in ${Date.now() - t0}ms`);

// 6. 渲染缓存命中
const t1 = Date.now();
const png2 = await renderMermaidToPng(mermaidSrc);
check('缓存命中', png2.equals(png) && Date.now() - t1 < 100);

// 7. 非法 mermaid → 渲染失败（resolve 层会降级）
let threw = false;
try {
  await renderMermaidToPng('this is not valid mermaid {{{');
} catch { threw = true; }
check('非法 mermaid 抛错（供降级捕获）', threw);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

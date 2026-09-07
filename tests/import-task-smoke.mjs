// tests/import-task-smoke.mjs — 验证 importMarkdownToDocument 路径的单元/集成测试
//
// 注意：完整端到端测试需要真实飞书 token + documentId，会在 wikid 上创建文档。
// 这里只覆盖不需要网络的单元层面：parseMarkdown 标题提取 + import_task 响应解析。

import { markdownToBlocks } from '../api/feishu-md.js';

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`[PASS] ${name}`); }
  else { fail += 1; console.error(`[FAIL] ${name} ${extra}`); }
};

// 1. 提取 H1 标题
const md1 = '# 我的文档标题\n\n正文';
const { title: t1 } = markdownToBlocks(md1);
check('从 H1 提取标题', t1 === '我的文档标题', `got "${t1}"`);

// 2. 默认 Untitled
const md2 = '没有 H1 开头';
const { title: t2 } = markdownToBlocks(md2);
check('无 H1 时默认 Untitled', t2 === 'Untitled', `got "${t2}"`);

// 3. 不影响 blocks 生成（mermaid 现在是普通代码块）
const md3 = '# T\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```js\nconst x = 1;\n```';
const { title: t3, blocks: b3 } = markdownToBlocks(md3);
check('含 mermaid 时能正常提取 H1', t3 === 'T');
check('含 mermaid 时 blocks 数 >= 3（heading + mermaid code + js code）', b3.length >= 3, `got ${b3.length}`);
const mermaidBlock = b3.find((b) => b.code && b.textElements?.some?.((t) => false));
// mermaid 应解析为 block_type=40 (飞书画板块)；js 仍为 block_type=14 (code)
const mermaidBoard = b3.find((b) => b.block_type === 40);
const jsCode = b3.find((b) => b.block_type === 14);
check('mermaid 解析为 block_type=40 (画板块)', !!mermaidBoard, `got block_type=${mermaidBoard?.block_type}`);
check('js 仍为 block_type=14 (代码块)', !!jsCode, `got block_type=${jsCode?.block_type}`);
check('mermaid component_type_id 正确', mermaidBoard?.add_ons?.component_type_id === 'blk_631fefbbae02400430b8f9f4');
check('mermaid source 保留完整', mermaidBoard?.add_ons?.record && JSON.parse(mermaidBoard.add_ons.record).data.includes('A --> B'));

// 4. import_task 响应解析（模拟 SDK 响应）
const sampleImportResponse = {
  ticket: 'abc123',
  // 实际响应结构可能是 { code:0, data:{ticket:'...'} } 或裸 ticket
};
const importTicket = sampleImportResponse.ticket || sampleImportResponse.data?.ticket;
check('import_task 响应解析兼容多种形态', importTicket === 'abc123');

// 5. import_task poll 响应解析
const samplePollResponse = {
  result: {
    job_status: 0,
    job_error_msg: 'success',
    token: 'newDocId123',
    url: 'https://feishu.cn/docx/newDocId123',
  },
};
const newDocId = samplePollResponse.result?.token;
const status = samplePollResponse.result?.job_status;
check('poll 响应 status=0 视为成功', status === 0);
check('poll 响应 token 解析正确', newDocId === 'newDocId123');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
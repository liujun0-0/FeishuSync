import fs from 'node:fs/promises';
const token = (await fs.readFile('./user-token.txt', 'utf8')).trim();
const SPACE = '7587058718827645920';
const EXP_CONTAINER = 'PlnHwOTSfion2ekfEX3cSctWn1c';

// Create a new doc in _experiment container via move_docs_to_wiki
async function createDoc(title, content) {
  // 1) Create empty doc
  const r1 = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  const d1 = await r1.json();
  const docId = d1.data?.document?.document_id;
  if (!docId) throw new Error('Failed to create doc: ' + JSON.stringify(d1));

  // 2) Add some content (heading)
  await fetch(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${docId}/children`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      children: [{
        block_type: 2,  // text
        text: { style: {}, elements: [{ text_run: { content: content || '实验B: 这是飞书侧新建的测试文档', text_element_style: {} } }] }
      }]
    })
  });

  // 3) Move to wiki container
  const r3 = await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes/move_docs_to_wiki`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      obj_type: 'docx',
      obj_token: docId,
      parent_wiki_token: EXP_CONTAINER
    })
  });
  const d3 = await r3.json();
  console.log('move_docs_to_wiki result:', JSON.stringify(d3, null, 2));
  return docId;
}

const docId = await createDoc('实验B-飞书侧新建测试', '实验B: 这个文档在飞书侧创建，应该被 FeishuSync 拉到本地 _experiment/ 目录');
console.log('Created doc with obj_token:', docId);
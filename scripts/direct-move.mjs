// 直接调底层 API 移动 BSP
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, apiPost, resolveSpaceId } from '../api/feishu.js';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const BSP_NODE = 'YIRYwdd4RiR7XKkcizFcahwJnRb';
const PARENT_NODE = 'UBsDwaAjiiVz0Hk';

console.log('=== 解析 spaceId ===');
const resolvedSpaceId = await resolveSpaceId(spaceId, token);
console.log('  resolved:', resolvedSpaceId);

console.log('\n=== 直接调 API ===');
console.log(`  nodeToken: ${BSP_NODE}`);
console.log(`  target_parent_token: ${PARENT_NODE}`);
try {
  await apiPost(
    `/wiki/v2/spaces/${resolvedSpaceId}/nodes/${BSP_NODE}/move`,
    token,
    { target_parent_token: PARENT_NODE }
  );
  console.log('  ✅ 成功');
} catch (e) {
  console.log('  失败:', e.message.slice(0, 120));
}

// 验证
console.log('\n=== 验证文档位置 ===');
try {
  const info = await apiGet('/wiki/v2/spaces/get_node', token, { token: BSP_NODE });
  console.log('  标题:', info?.node?.title);
  console.log('  parent_node_token:', info?.node?.parent_node_token);
} catch (e) {
  console.log('  get_node 失败:', e.message.slice(0, 80));
}

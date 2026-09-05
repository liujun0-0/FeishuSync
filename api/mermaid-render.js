// api/mermaid-render.js
//
// B 方案：把 mermaid 源码渲染成 PNG buffer（兜底路径）。
// 当 A 方案（mermaid → 飞书 diagram record）失败时使用。
// 渲染走 @mermaid-js/mermaid-cli (mmdc)，它内部用 puppeteer + 系统 Chrome。
//
// 缓存策略：同一 mermaid source 渲染结果幂等，缓存到 .feishu-diagram-cache/，
// 用 source 的 sha256 前 16 位作为 key。

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 项目根目录 = api/ 的上一级
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * 缓存目录。放在项目根 .feishu-diagram-cache 下，不进 git（已在 .gitignore）。
 */
function getCacheDir(rootDir) {
  return path.join(rootDir || '.', '.feishu-diagram-cache');
}

/**
 * 计算 mermaid source 的缓存 key。
 * 仅取 sha256 前 16 位足以避免冲突。
 */
function cacheKey(source) {
  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

/**
 * 在缓存目录里找已有的 PNG。返回 Buffer 或 null。
 */
async function readFromCache(source, cacheDir) {
  const key = cacheKey(source);
  const cachePath = path.join(cacheDir, `${key}.png`);
  try {
    return await fs.readFile(cachePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * 写 PNG 到缓存。
 */
async function writeToCache(source, png, cacheDir) {
  await fs.mkdir(cacheDir, { recursive: true });
  const key = cacheKey(source);
  const cachePath = path.join(cacheDir, `${key}.png`);
  await fs.writeFile(cachePath, png);
}

/**
 * 调用 mmdc 渲染 mermaid 到 PNG。
 *
 * mmdc 接收 .mmd 输入文件和 .png 输出文件。我们用临时文件做中转，
 * 因为 mmdc 不支持 stdin / buffer 入口。
 *
 * @param {string} source - mermaid 源码
 * @param {object} options - { rootDir, theme, background }
 * @returns {Promise<Buffer>} PNG buffer
 */
async function runMmdc(source, options = {}) {
  const theme = options.theme || 'default';
  const background = options.background || 'white';
  // 默认固定到项目根，避免不同 cwd 启动 sync 时缓存目录漂移
  const rootDir = options.rootDir || PROJECT_ROOT;
  const cacheDir = getCacheDir(rootDir);

  // 1. 查缓存
  const cached = await readFromCache(source, cacheDir);
  if (cached) return cached;

  // 2. 写临时文件
  const tmpDir = path.join(cacheDir, 'tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpId = cacheKey(source);
  const inputPath = path.join(tmpDir, `${tmpId}.mmd`);
  const outputPath = path.join(tmpDir, `${tmpId}.png`);
  await fs.writeFile(inputPath, source, 'utf8');

  // 3. 调 mmdc
  try {
    await new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-o', outputPath,
        '-t', theme,
        '-b', background,
        '--quiet',
      ];
      // 直接调 node_modules/.bin/mmdc，避免 npx 在 PATH 里找不到
      // Windows 上 .cmd 必须经 cmd.exe 调用，shell: true + 数组参数是规范用法
      const mmdcBin = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'mmdc.cmd');
      const child = spawn('cmd.exe', ['/c', mmdcBin, ...args], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`mmdc 渲染超时 ${DEFAULT_TIMEOUT_MS / 1000}s`));
      }, DEFAULT_TIMEOUT_MS);

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`mmdc 启动失败: ${err.message}`));
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`mmdc 退出码 ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`));
      });
    });

    // 4. 读 PNG buffer
    const png = await fs.readFile(outputPath);

    // 5. 写缓存
    await writeToCache(source, png, cacheDir);

    return png;
  } finally {
    // 6. 清临时文件
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

/**
 * 把 mermaid 源码渲染成 PNG。失败抛错。
 * @param {string} source
 * @param {object} options
 * @returns {Promise<Buffer>}
 */
export async function renderMermaidToPng(source, options = {}) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('renderMermaidToPng: source 不能为空');
  }
  return runMmdc(source, options);
}

/**
 * 清空缓存目录。供 CLI 工具调用。
 */
export async function clearDiagramCache(rootDir) {
  const cacheDir = getCacheDir(rootDir);
  await fs.rm(cacheDir, { recursive: true, force: true });
}
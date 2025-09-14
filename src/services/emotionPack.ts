import { appDataDir } from '@tauri-apps/api/path'
import { readDir, readTextFile, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { extractZipFile } from '../utils/archive'
import { useAppearanceConfigStore } from '../stores/configs/appearanceConfig'
import type { ColorTheme, EmotionDescription } from '../types/emotion'

// 内置表情包位于 public/default_emotion_pack 下，首次或版本不匹配时从该目录复制到应用数据目录
const DEFAULT_PACK_PUBLIC_ROOT = '/default_emotion_pack'

// 兼容导入：从 types 中 re-export
export type { EmotionDescription, ColorTheme }

interface PackConfig {
  map: Record<string, number>
  default: number
}

// 不再使用模块级非响应状态，改为使用 Pinia store 中的响应式字段
const CURRENT_FILE = '.current'

/**
 * 连接路径，处理路径分隔符
 * @param a 基础路径
 * @param b 追加路径
 * @returns 连接后的路径
 */
function joinPath(a: string, b: string): string {
  if (!a) return b
  if (a.endsWith('/') || a.endsWith('\\')) return `${a}${b}`
  return `${a}/${b}`
}

/**
 * 查找第一个有效的表情包根目录
 * @param packsRoot 表情包根目录
 * @returns 第一个有效的表情包路径
 */
async function findFirstPackRoot(packsRoot: string): Promise<string> {
  try {
    const entries = await readDir(packsRoot)
    for (const e of entries) {
      if (e.isDirectory) {
        const dirPath = joinPath(packsRoot, e.name)
        const cfg = joinPath(dirPath, 'config.json')
        if (await exists(cfg)) return dirPath
      }
    }
  } catch (error) {
    console.warn('查找表情包时出错:', error)
  }
  // fallback to default folder name
  return joinPath(packsRoot, 'default_emotion_pack')
}

/**
 * 获取表情包根目录
 * @returns 表情包根目录路径
 */
async function getPacksRoot(): Promise<string> {
  const base = await appDataDir()
  return joinPath(base, 'emotion_packs')
}

/**
 * 读取当前选中的表情包名称
 * @param packsRoot 表情包根目录
 * @returns 当前选中的表情包名称
 */
async function readCurrentPackName(packsRoot: string): Promise<string | null> {
  try {
    const cur = joinPath(packsRoot, CURRENT_FILE)
    if (!(await exists(cur))) return null
    const name = (await readTextFile(cur)).trim()
    return name || null
  } catch (error) {
    console.warn('读取当前表情包名称失败:', error)
    return null
  }
}

/**
 * 写入当前选中的表情包名称
 * @param packsRoot 表情包根目录
 * @param name 表情包名称
 */
async function writeCurrentPackName(packsRoot: string, name: string): Promise<void> {
  try {
    const p = joinPath(packsRoot, CURRENT_FILE)
    await writeFile(p, new TextEncoder().encode(name))
  } catch (error) {
    console.error('写入当前表情包名称失败:', error)
    throw error
  }
}

/**
 * 列出所有可用的表情包
 * @returns 表情包名称列表
 */
export async function listEmotionPacks(): Promise<string[]> {
  const packsRoot = await getPacksRoot()
  try {
    const entries = await readDir(packsRoot)
    const names: string[] = []
    for (const e of entries) {
      if (e.isDirectory) {
        const cfg = joinPath(joinPath(packsRoot, e.name), 'config.json')
        if (await exists(cfg)) names.push(e.name)
      }
    }
    return names
  } catch (error) {
    console.warn('列出表情包时出错:', error)
    return []
  }
}

/**
 * 确保默认表情包存在
 */
export async function ensureDefaultEmotionPack(): Promise<void> {
  const packsRoot = await getPacksRoot()
  if (!(await exists(packsRoot))) {
    try {
      await mkdir(packsRoot, { recursive: true })
    } catch (error) {
      console.error('创建表情包目录失败:', error)
      throw error
    }
  }

  // 读取已安装版本
  const defaultDir = joinPath(packsRoot, 'default_emotion_pack')
  const installedConfigPath = joinPath(defaultDir, 'config.json')
  let installedVersion: number | null = null
  try {
    if (await exists(installedConfigPath)) {
      const raw = await readTextFile(installedConfigPath)
      const cfg = JSON.parse(raw) as any
      installedVersion = typeof cfg.version === 'number' ? cfg.version : null
    }
  } catch (error) {
    console.warn('读取已安装表情包版本失败:', error)
    installedVersion = null
  }

  // 读取内置版本（来自 public 目录里的 config.json）
  let expectedVersion: number | null = null
  try {
    const resp = await fetch(`${DEFAULT_PACK_PUBLIC_ROOT}/config.json`)
    if (resp.ok) {
      const json = await resp.json()
      expectedVersion = typeof json?.version === 'number' ? json.version : null
    }
  } catch (error) {
    console.warn('读取内置表情包版本失败:', error)
    expectedVersion = null
  }

  const needUpdate = !(await exists(defaultDir))
    || installedVersion === null
    || (expectedVersion !== null && installedVersion !== expectedVersion)
    
  if (!needUpdate) return

  try {
    console.log('正在复制内置默认表情包...')
    // 确保目标目录存在
    if (!(await exists(defaultDir))) {
      await mkdir(defaultDir, { recursive: true })
    }

    // 拉取并写入 config.json
    const cfgResp = await fetch(`${DEFAULT_PACK_PUBLIC_ROOT}/config.json`)
    if (!cfgResp.ok) throw new Error('无法读取默认表情包 config.json')
    const cfgText = await cfgResp.text()
    await writeFile(installedConfigPath, new TextEncoder().encode(cfgText))

    // 拉取并写入 color.json
    const colorResp = await fetch(`${DEFAULT_PACK_PUBLIC_ROOT}/color.json`)
    if (!colorResp.ok) throw new Error('无法读取默认表情包 color.json')
    const colorText = await colorResp.text()
    const installedColorPath = joinPath(defaultDir, 'color.json')
    await writeFile(installedColorPath, new TextEncoder().encode(colorText))

    // 根据 config.map 复制图片
    const cfg = JSON.parse(cfgText) as { map: Record<string, number> }
    const codes = Array.from(new Set(Object.values(cfg.map)))
    for (const code of codes) {
      const imgResp = await fetch(`${DEFAULT_PACK_PUBLIC_ROOT}/${code}.png`)
      if (!imgResp.ok) {
        console.warn('缺少默认表情图片:', code)
        continue
      }
      const buf = await imgResp.arrayBuffer()
      const dst = joinPath(defaultDir, `${code}.png`)
      await writeFile(dst, new Uint8Array(buf))
    }
  } catch (err) {
    console.error('复制默认表情包失败: ', err)
    throw err
  }
}

/**
 * 从ZIP文件导入表情包
 * @param zipPath ZIP文件路径
 */
export async function importEmotionPackFromZip(zipPath: string): Promise<void> {
  const packsRoot = await getPacksRoot()
  if (!(await exists(packsRoot))) {
    await mkdir(packsRoot, { recursive: true })
  }
  await extractZipFile(zipPath, packsRoot)
}

/**
 * 设置当前激活的表情包
 * @param name 表情包名称
 */
export async function setActiveEmotionPack(name: string): Promise<void> {
  const packsRoot = await getPacksRoot()
  await writeCurrentPackName(packsRoot, name)
  await initEmotionPack(name)
}

/**
 * 获取当前激活的表情包名称
 * @returns 当前激活的表情包名称
 */
export async function getActiveEmotionPack(): Promise<string | null> {
  const packsRoot = await getPacksRoot()
  return await readCurrentPackName(packsRoot)
}

/**
 * 初始化表情包
 * @param preferredPack 首选表情包名称
 */
export async function initEmotionPack(preferredPack?: string): Promise<void> {
  const ac = useAppearanceConfigStore()
  const packsRoot = await getPacksRoot()
  const selected = preferredPack ?? (await readCurrentPackName(packsRoot))
  const packRoot = selected
    ? joinPath(packsRoot, selected)
    : await findFirstPackRoot(packsRoot)

  try {
    const configPath = joinPath(packRoot, 'config.json')
    const colorsPath = joinPath(packRoot, 'color.json')

    const cfgRaw = await readTextFile(configPath)
    const colorsRaw = await readTextFile(colorsPath)

    const cfg = JSON.parse(cfgRaw) as PackConfig
    const colorsJson = JSON.parse(colorsRaw) as Record<string, ColorTheme>

    const descriptionToCode: Record<string, number> = { ...cfg.map }
    const codeToDescription: string[] = []
    for (const [desc, code] of Object.entries(descriptionToCode)) {
      codeToDescription[code] = desc
    }
    
    // 读取默认编号（配置以数字表示），并回退到第一个有效项
    let defaultCode = cfg.default
    if (!Number.isInteger(defaultCode) || typeof codeToDescription[defaultCode] !== 'string') {
      const firstValid = codeToDescription.findIndex(v => typeof v === 'string' && v.length > 0)
      defaultCode = firstValid >= 0 ? firstValid : 0
    }
    const defaultDescription = codeToDescription[defaultCode] ?? '默认'

    const colors: Record<number, ColorTheme> = {}
    for (const [k, v] of Object.entries(colorsJson)) {
      const code = Number(k)
      if (Number.isFinite(code)) colors[code] = v
    }

    // 写入响应式 store
    ac.emotionPackRoot = packRoot
    // 编号->描述
    ac.emotionCodeToDescription = codeToDescription
    ac.defaultEmotionDescription = defaultDescription
    ac.defaultEmotionCode = defaultCode
    Object.keys(ac.emotionColors).forEach(k => delete (ac.emotionColors as any)[k])
    for (const [k, v] of Object.entries(colors)) {
      (ac.emotionColors as any)[Number(k)] = v
    }
    
    // bump 版本，通知 UI 刷新
    ac.emotionPackVersion++
    
    // 持久化当前选择
    try {
      const curName = packRoot.split(/[/\\]/).pop() || 'default_emotion_pack'
      await writeCurrentPackName(packsRoot, curName)
      // 更新store中的当前表情包名称
      ac.activeEmotionPackName = curName
    } catch (error) {
      console.warn('持久化当前表情包名称失败:', error)
    }
  } catch (error) {
    console.error('初始化表情包失败:', error)
    throw error
  }
}

/**
 * 列出所有表情描述
 * @returns 表情描述列表
 */
export function listEmotionDescriptions(): EmotionDescription[] {
  const ac = useAppearanceConfigStore()
  return ac.emotionCodeToDescription.slice()
}

/**
 * 根据编号获取表情描述
 * @param code 表情编号
 * @returns 表情描述
 */
export function codeToEmotion(code: number): EmotionDescription {
  const ac = useAppearanceConfigStore()
  return Number.isInteger(code) && code >= 0 && code < ac.emotionCodeToDescription.length
    ? ac.emotionCodeToDescription[code]
    : ac.defaultEmotionDescription
}

/**
 * 获取默认表情编号
 * @returns 默认表情编号
 */
export function getDefaultEmotionCode(): number {
  const ac = useAppearanceConfigStore()
  return ac.defaultEmotionCode
}

/**
 * 获取表情编号提示文本
 * @returns 表情编号提示文本
 */
export function getEmotionCodePrompt(): string {
  const ac = useAppearanceConfigStore()
  return ac.emotionCodeToDescription.map((n, i) => `${n}：${i}`).join('\n')
}

// 默认颜色主题
const FALLBACK_THEME: ColorTheme = {
  background: 'rgba(248, 250, 252, 0.98)',
  border: 'rgba(203, 213, 225, 0.6)',
  text: '#334155',
  shadow: 'rgba(100, 116, 139, 0.15)'
}

/**
 * 根据编号获取表情颜色主题
 * @param code 表情编号
 * @returns 颜色主题
 */
export function getEmotionColorThemeByCode(code: number): ColorTheme {
  const ac = useAppearanceConfigStore()
  return ac.emotionColors[code] ?? FALLBACK_THEME
}

/**
 * 根据编号获取表情图片路径
 * @param code 表情编号
 * @returns 表情图片路径
 */
export function getEmotionImageSrcByCode(code: number): string {
  const ac = useAppearanceConfigStore()
  const p = joinPath(ac.emotionPackRoot, `${code}.png`)
  // 基础 URL（可能自带查询参数）
  const base = convertFileSrc(p)
  const url = new URL(base)
  // 附加版本号，击穿缓存；同时附上当前选择（可选，便于调试）
  url.searchParams.set('v', String(ac.emotionPackVersion))
  if (typeof ac.activeEmotionPackName === 'string' && ac.activeEmotionPackName) {
    url.searchParams.set('pack', ac.activeEmotionPackName)
  }
  return url.toString()
}
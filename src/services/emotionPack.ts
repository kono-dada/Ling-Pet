import { appDataDir } from '@tauri-apps/api/path'
import { readDir, readTextFile, exists, mkdir, writeFile, remove } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { extractZipFile } from '../utils/archive'
import { useAppearanceConfigStore } from '../stores/appearanceConfig'
import type { ColorTheme, EmotionName } from '../types/emotion'

// 兼容旧导入：从 types 中 re-export
export type { EmotionName, ColorTheme }

interface PackConfig {
  map: Record<string, number>
  default: string
}

// 不再使用模块级非响应状态，改为使用 Pinia store 中的响应式字段
const CURRENT_FILE = '.current'

function joinPath(a: string, b: string): string {
  if (!a) return b
  if (a.endsWith('/') || a.endsWith('\\')) return `${a}${b}`
  return `${a}/${b}`
}

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
  } catch {
    // ignore
  }
  // fallback to default folder name
  return joinPath(packsRoot, 'default_emotion_pack')
}

async function getPacksRoot(): Promise<string> {
  const base = await appDataDir()
  return joinPath(base, 'emotion_packs')
}

async function readCurrentPackName(packsRoot: string): Promise<string | null> {
  try {
    const cur = joinPath(packsRoot, CURRENT_FILE)
    if (!(await exists(cur))) return null
    const name = (await readTextFile(cur)).trim()
    return name || null
  } catch {
    return null
  }
}

async function writeCurrentPackName(packsRoot: string, name: string): Promise<void> {
  const p = joinPath(packsRoot, CURRENT_FILE)
  await writeFile(p, new TextEncoder().encode(name))
}

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
  } catch {
    return []
  }
}

export async function ensureDefaultEmotionPack(): Promise<void> {
  const packsRoot = await getPacksRoot()
  if (!(await exists(packsRoot))) await mkdir(packsRoot, { recursive: true })
  const list = await listEmotionPacks()
  if (list.includes('default_emotion_pack')) {
    // 已存在 default_emotion_pack，无需解压
    return
  }
  // 从内置资源解压默认表情包
  try {
    console.log('正在解压默认表情包...')
    const resp = await fetch('/default_emotion_pack.zip')
    if (!resp.ok) throw new Error(`无法读取内置表情包: ${resp.status}`)
    const buf = await resp.arrayBuffer()
    const tmpZip = joinPath(packsRoot, 'default_emotion_pack.zip')
    await writeFile(tmpZip, new Uint8Array(buf))
    await extractZipFile(tmpZip, packsRoot)
    try { await remove(tmpZip) } catch { }
  } catch (err) {
    console.error('解压默认表情包失败: ', err)
  }
}

export async function importEmotionPackFromZip(zipPath: string): Promise<void> {
  const packsRoot = await getPacksRoot()
  if (!(await exists(packsRoot))) await mkdir(packsRoot, { recursive: true })
  await extractZipFile(zipPath, packsRoot)
}

export async function setActiveEmotionPack(name: string): Promise<void> {
  const packsRoot = await getPacksRoot()
  await writeCurrentPackName(packsRoot, name)
  await initEmotionPack(name)
}

export async function getActiveEmotionPack(): Promise<string | null> {
  const packsRoot = await getPacksRoot()
  return await readCurrentPackName(packsRoot)
}

export async function initEmotionPack(preferredPack?: string): Promise<void> {
  const ac = useAppearanceConfigStore()
  const packsRoot = await getPacksRoot()
  const selected = preferredPack ?? (await readCurrentPackName(packsRoot))
  const packRoot = selected
    ? joinPath(packsRoot, selected)
    : await findFirstPackRoot(packsRoot)

  const configPath = joinPath(packRoot, 'config.json')
  const colorsPath = joinPath(packRoot, 'color.json')

  const cfgRaw = await readTextFile(configPath)
  const colorsRaw = await readTextFile(colorsPath)

  const cfg = JSON.parse(cfgRaw) as PackConfig
  const colorsJson = JSON.parse(colorsRaw) as Record<string, ColorTheme>

  const nameToCode: Record<string, number> = { ...cfg.map }
  const codeToName: string[] = []
  for (const [name, code] of Object.entries(nameToCode)) {
    codeToName[code] = name
  }
  const defaultName = cfg.default in nameToCode ? cfg.default : codeToName[0] ?? '默认'

  const colors: Record<number, ColorTheme> = {}
  for (const [k, v] of Object.entries(colorsJson)) {
    const code = Number(k)
    if (Number.isFinite(code)) colors[code] = v
  }

  // 写入响应式 store
  ac.emotionPackRoot = packRoot
  // 清空再填充，保持引用稳定
  Object.keys(ac.emotionNameToCode).forEach(k => delete (ac.emotionNameToCode as any)[k])
  for (const [n, c] of Object.entries(nameToCode)) (ac.emotionNameToCode as any)[n] = c
  ac.emotionCodeToName = codeToName
  ac.defaultEmotionName = defaultName
  Object.keys(ac.emotionColors).forEach(k => delete (ac.emotionColors as any)[k])
  for (const [k, v] of Object.entries(colors)) (ac.emotionColors as any)[Number(k)] = v
  // bump 版本，通知 UI 刷新
  ac.emotionPackVersion++
  // 持久化当前选择
  try {
    const curName = packRoot.split(/[/\\]/).pop() || 'default_emotion_pack'
    await writeCurrentPackName(packsRoot, curName)
  } catch { }
}

export function listEmotionNames(): EmotionName[] {
  const ac = useAppearanceConfigStore()
  return ac.emotionCodeToName.slice()
}

export function emotionNameToCode(name: EmotionName): number {
  const ac = useAppearanceConfigStore()
  const code = ac.emotionNameToCode[name]
  return Number.isInteger(code) ? code as number : ac.emotionNameToCode[ac.defaultEmotionName]
}

export function codeToEmotion(code: number): EmotionName {
  const ac = useAppearanceConfigStore()
  return Number.isInteger(code) && code >= 0 && code < ac.emotionCodeToName.length
    ? ac.emotionCodeToName[code]
    : ac.defaultEmotionName
}

export function getDefaultEmotionName(): EmotionName {
  const ac = useAppearanceConfigStore()
  return ac.defaultEmotionName
}

export function getDefaultEmotionCode(): number {
  const ac = useAppearanceConfigStore()
  return ac.emotionNameToCode[ac.defaultEmotionName]
}

export function getEmotionCodePrompt(): string {
  const ac = useAppearanceConfigStore()
  return ac.emotionCodeToName.map((n, i) => `${n}：${i}`).join('\n')
}

const FALLBACK_THEME: ColorTheme = {
  background: 'rgba(248, 250, 252, 0.98)',
  border: 'rgba(203, 213, 225, 0.6)',
  text: '#334155',
  shadow: 'rgba(100, 116, 139, 0.15)'
}

export function getEmotionColorThemeByCode(code: number): ColorTheme {
  const ac = useAppearanceConfigStore()
  return ac.emotionColors[code] ?? FALLBACK_THEME
}

export function getEmotionColorThemeByName(name: EmotionName): ColorTheme {
  return getEmotionColorThemeByCode(emotionNameToCode(name))
}

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

export function getEmotionImageSrcByName(name: EmotionName): string {
  return getEmotionImageSrcByCode(emotionNameToCode(name))
}

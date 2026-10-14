import { FORMATS, type FormatId, type PaperId } from './formats'
import { photoCount, type TemplateId } from './templates'
import type { PhotoFill } from './crop'

export interface PhotoMeta {
  id: string
  name: string
  w: number
  h: number
}

export interface Page {
  id: string
  template: TemplateId
  fills: (PhotoFill | null)[]
  text: string
}

export interface Project {
  version: 1
  format: FormatId
  paper: PaperId
  pages: Page[]
  photos: PhotoMeta[]
  /** Bleed in mm for loose pages (print shop). Home-printed formats ignore it. */
  bleed: number
  cropMarks: boolean
  updatedAt: number
}

export const uid = () => crypto.randomUUID().slice(0, 8)

export function newPage(template: TemplateId): Page {
  return { id: uid(), template, fills: Array(photoCount(template)).fill(null), text: '' }
}

export function createProject(format: FormatId, paper: PaperId): Project {
  const n = FORMATS[format].defaultPages
  const pages = Array.from({ length: n }, (_, i) =>
    newPage(i === 0 ? 'bleed' : i === n - 1 ? 'caption' : 'one'),
  )
  return { version: 1, format, paper, pages, photos: [], bleed: 3, cropMarks: true, updatedAt: Date.now() }
}

export const blankFill = (photoId: string): PhotoFill => ({ photoId, zoom: 1, fx: 0.5, fy: 0.5 })

export const bleedFor = (p: Project) => (p.format === 'loose' ? p.bleed : 0)

/** Put new photos into empty slots in reading order; grow open-ended formats if needed. */
export function autoFill(p: Project, photoIds: string[]): Project {
  const queue = [...photoIds]
  const pages = p.pages.map((page) => ({
    ...page,
    fills: page.fills.map((f) => f ?? (queue.length ? blankFill(queue.shift()!) : null)),
  }))
  if (p.format !== 'mini') {
    while (queue.length) {
      const page = newPage('one')
      page.fills = [blankFill(queue.shift()!)]
      pages.splice(Math.max(1, pages.length - 1), 0, page)
    }
  }
  return { ...p, pages }
}

export function withTemplate(page: Page, template: TemplateId): Page {
  const n = photoCount(template)
  const kept = page.fills.filter(Boolean)
  return { ...page, template, fills: Array.from({ length: n }, (_, i) => kept[i] ?? null) }
}

export interface Usage {
  page: number
  slot: number
}

export function photoUsages(p: Project): Map<string, Usage[]> {
  const out = new Map<string, Usage[]>()
  p.pages.forEach((page, pi) =>
    page.fills.forEach((f, si) => {
      if (!f) return
      const list = out.get(f.photoId) ?? []
      list.push({ page: pi, slot: si })
      out.set(f.photoId, list)
    }),
  )
  return out
}

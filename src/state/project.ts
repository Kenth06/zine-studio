import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { PhotoFill } from '../lib/crop'
import type { FormatId, PaperId } from '../lib/formats'
import { autoFill, blankFill, createProject, newPage, withTemplate, type PhotoMeta, type Project } from '../lib/model'
import { loadProject, loadThumb, saveProject } from '../lib/storage'
import type { TemplateId } from '../lib/templates'

export type Action =
  | { type: 'load'; project: Project | null }
  | { type: 'create'; format: FormatId; paper: PaperId }
  | { type: 'addPhotos'; photos: PhotoMeta[]; fill: boolean }
  | { type: 'removePhoto'; id: string }
  | { type: 'assign'; page: number; slot: number; photoId: string }
  | { type: 'clearSlot'; page: number; slot: number }
  | { type: 'updateFill'; page: number; slot: number; fill: PhotoFill }
  | { type: 'setTemplate'; page: number; template: TemplateId }
  | { type: 'setText'; page: number; text: string }
  | { type: 'movePage'; from: number; to: number }
  | { type: 'addPage'; after: number; count?: number }
  | { type: 'removePage'; page: number }
  | { type: 'setPaper'; paper: PaperId }
  | { type: 'setPrint'; bleed?: number; cropMarks?: boolean }
  | { type: 'reset' }

function mapPage(p: Project, i: number, fn: (page: Project['pages'][0]) => Project['pages'][0]): Project {
  return { ...p, pages: p.pages.map((page, j) => (j === i ? fn(page) : page)) }
}

function reduce(p: Project | null, a: Action): Project | null {
  if (a.type === 'load') return a.project
  if (a.type === 'create') return createProject(a.format, a.paper)
  if (a.type === 'reset' || !p) return null

  switch (a.type) {
    case 'addPhotos': {
      const next = { ...p, photos: [...p.photos, ...a.photos] }
      return a.fill ? autoFill(next, a.photos.map((x) => x.id)) : next
    }
    case 'removePhoto':
      return {
        ...p,
        photos: p.photos.filter((x) => x.id !== a.id),
        pages: p.pages.map((page) => ({ ...page, fills: page.fills.map((f) => (f?.photoId === a.id ? null : f)) })),
      }
    case 'assign':
      return mapPage(p, a.page, (page) => ({
        ...page,
        fills: page.fills.map((f, i) => (i === a.slot ? blankFill(a.photoId) : f)),
      }))
    case 'clearSlot':
      return mapPage(p, a.page, (page) => ({ ...page, fills: page.fills.map((f, i) => (i === a.slot ? null : f)) }))
    case 'updateFill':
      return mapPage(p, a.page, (page) => ({ ...page, fills: page.fills.map((f, i) => (i === a.slot ? a.fill : f)) }))
    case 'setTemplate':
      return mapPage(p, a.page, (page) => withTemplate(page, a.template))
    case 'setText':
      return mapPage(p, a.page, (page) => ({ ...page, text: a.text }))
    case 'movePage': {
      if (a.to < 0 || a.to >= p.pages.length || a.from === a.to) return p
      const pages = [...p.pages]
      const [moved] = pages.splice(a.from, 1)
      pages.splice(a.to, 0, moved)
      return { ...p, pages }
    }
    case 'addPage': {
      if (p.format === 'mini') return p
      const pages = [...p.pages]
      pages.splice(a.after + 1, 0, ...Array.from({ length: a.count ?? 1 }, () => newPage('one')))
      return { ...p, pages }
    }
    case 'removePage':
      if (p.format === 'mini' || p.pages.length <= 2) return p
      return { ...p, pages: p.pages.filter((_, i) => i !== a.page) }
    case 'setPaper':
      return { ...p, paper: a.paper }
    case 'setPrint':
      return { ...p, bleed: a.bleed ?? p.bleed, cropMarks: a.cropMarks ?? p.cropMarks }
  }
}

function reducer(p: Project | null, a: Action) {
  const next = reduce(p, a)
  return next && next !== p && a.type !== 'load' ? { ...next, updatedAt: Date.now() } : next
}

/** Project state with debounced autosave to IndexedDB. */
export function useProject() {
  const [project, dispatch] = useReducer(reducer, null)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState<Project | null>(null)

  useEffect(() => {
    loadProject()
      .then((p) => setDraft(p ?? null))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!project) return
    const t = setTimeout(() => void saveProject(project), 300)
    return () => clearTimeout(t)
  }, [project])

  return { project, dispatch, ready, draft }
}

/** Object URLs for editor previews, loaded lazily from IndexedDB. */
export function useThumbs(photos: PhotoMeta[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const owned = useRef<Record<string, string>>({})

  const put = useCallback((id: string, blob: Blob) => {
    if (owned.current[id]) return
    owned.current[id] = URL.createObjectURL(blob)
    setUrls({ ...owned.current })
  }, [])

  useEffect(() => {
    for (const p of photos) {
      if (owned.current[p.id]) continue
      loadThumb(p.id).then((b) => b && put(p.id, b))
    }
  }, [photos, put])

  useEffect(
    () => () => {
      Object.values(owned.current).forEach(URL.revokeObjectURL)
    },
    [],
  )

  return { urls, put }
}

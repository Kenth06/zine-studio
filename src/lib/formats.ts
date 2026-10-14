export type FormatId = 'mini' | 'booklet' | 'loose'
export type PaperId = 'letter' | 'a4'

export const MM_PER_IN = 25.4
export const PT_PER_MM = 72 / MM_PER_IN
export const pt = (mm: number) => mm * PT_PER_MM

/** Sheet size in landscape orientation, in mm. */
export const PAPER: Record<PaperId, { w: number; h: number; label: string }> = {
  letter: { w: 279.4, h: 215.9, label: 'Carta' },
  a4: { w: 297, h: 210, label: 'A4' },
}

export interface FormatSpec {
  id: FormatId
  name: string
  /** One-line explanation of how the printed piece is made. */
  howTo: (paper: PaperId) => string
  pageSize: (paper: PaperId) => { w: number; h: number }
  pageSizeLabel: (paper: PaperId) => string
  fixedPages?: number
  defaultPages: number
  /** Page counts must be a multiple of this to print. */
  multipleOf: number
}

export const FORMATS: Record<FormatId, FormatSpec> = {
  mini: {
    id: 'mini',
    name: 'Mini-zine',
    howTo: (p) => `8 páginas · 1 hoja ${PAPER[p].label} · se corta 1 vez`,
    pageSize: (p) => ({ w: PAPER[p].w / 4, h: PAPER[p].h / 2 }),
    pageSizeLabel: (p) => (p === 'letter' ? '2,75 × 4,25 in' : '74 × 105 mm'),
    fixedPages: 8,
    defaultPages: 8,
    multipleOf: 8,
  },
  booklet: {
    id: 'booklet',
    name: 'Cuadernillo grapado',
    howTo: (p) => `Hojas ${PAPER[p].label} a doble cara · se dobla y se grapa al lomo`,
    pageSize: (p) => ({ w: PAPER[p].w / 2, h: PAPER[p].h }),
    pageSizeLabel: (p) => (p === 'letter' ? 'Media carta' : 'A5'),
    defaultPages: 12,
    multipleOf: 4,
  },
  loose: {
    id: 'loose',
    name: 'Páginas sueltas',
    howTo: (p) => `${p === 'letter' ? 'Media carta' : 'A5'} con sangrado · para imprenta`,
    pageSize: (p) => ({ w: PAPER[p].w / 2, h: PAPER[p].h }),
    pageSizeLabel: (p) => (p === 'letter' ? 'Media carta' : 'A5'),
    defaultPages: 12,
    multipleOf: 1,
  },
}

/** Safe-zone margin: at least 5 mm, more on larger pages. */
export function marginFor(page: { w: number; h: number }) {
  return Math.max(5, Math.round(Math.min(page.w, page.h) * 0.07))
}

export function summary(format: FormatId, paper: PaperId, pages: number) {
  const f = FORMATS[format]
  if (format === 'mini') return f.howTo(paper)
  if (format === 'booklet') {
    const sheets = Math.ceil(pages / 4)
    return `${pages} páginas · ${f.pageSizeLabel(paper)} · ${sheets} ${sheets === 1 ? 'hoja' : 'hojas'} ${PAPER[paper].label}`
  }
  return `${pages} páginas · ${f.pageSizeLabel(paper)} · para imprenta`
}

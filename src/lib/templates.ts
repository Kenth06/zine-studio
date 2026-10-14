import { marginFor } from './formats'

export type TemplateId = 'bleed' | 'one' | 'two' | 'three' | 'four' | 'caption' | 'text'

/** Rect in mm, origin at the trim box top-left. Bleed slots extend past it. */
export interface Slot {
  kind: 'photo' | 'text'
  x: number
  y: number
  w: number
  h: number
}

export const TEMPLATES: { id: TemplateId; label: string; photos: number }[] = [
  { id: 'bleed', label: 'Foto a sangre', photos: 1 },
  { id: 'one', label: 'Una foto', photos: 1 },
  { id: 'two', label: 'Dos fotos', photos: 2 },
  { id: 'three', label: 'Tres fotos', photos: 3 },
  { id: 'four', label: 'Cuatro fotos', photos: 4 },
  { id: 'caption', label: 'Foto con texto', photos: 1 },
  { id: 'text', label: 'Solo texto', photos: 0 },
]

export const photoCount = (t: TemplateId) => TEMPLATES.find((x) => x.id === t)!.photos

/**
 * Slot geometry for a page. The same numbers drive the on-screen editor
 * (as percentages) and the PDF (as points), so preview and print match.
 */
export function slotsFor(t: TemplateId, page: { w: number; h: number }, bleed = 0): Slot[] {
  const m = marginFor(page)
  const g = Math.max(2.5, m * 0.4)
  const cw = page.w - 2 * m
  const ch = page.h - 2 * m
  const photo = (x: number, y: number, w: number, h: number): Slot => ({ kind: 'photo', x, y, w, h })

  switch (t) {
    case 'bleed':
      return [photo(-bleed, -bleed, page.w + 2 * bleed, page.h + 2 * bleed)]
    case 'one':
      return [photo(m, m, cw, ch)]
    case 'two': {
      const h = (ch - g) / 2
      return [photo(m, m, cw, h), photo(m, m + h + g, cw, h)]
    }
    case 'three': {
      const top = (ch - g) * 0.58
      const bh = ch - g - top
      const bw = (cw - g) / 2
      return [photo(m, m, cw, top), photo(m, m + top + g, bw, bh), photo(m + bw + g, m + top + g, bw, bh)]
    }
    case 'four': {
      const w = (cw - g) / 2
      const h = (ch - g) / 2
      return [
        photo(m, m, w, h),
        photo(m + w + g, m, w, h),
        photo(m, m + h + g, w, h),
        photo(m + w + g, m + h + g, w, h),
      ]
    }
    case 'caption': {
      const h = ch * 0.74
      return [photo(m, m, cw, h), { kind: 'text', x: m, y: m + h + g, w: cw, h: ch - h - g }]
    }
    case 'text':
      return [{ kind: 'text', x: m, y: m, w: cw, h: ch }]
  }
}

/** Body text size in pt, scaled to the page. */
export function textSizePt(page: { w: number; h: number }) {
  return page.h < 130 ? 8.5 : 11
}

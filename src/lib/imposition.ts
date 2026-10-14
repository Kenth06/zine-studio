/**
 * Page ordering for print. Pure functions over 1-based page numbers so they can
 * be tested without PDFs; the PDF layer only places what these return.
 */

export interface MiniCell {
  page: number
  row: 0 | 1
  col: 0 | 1 | 2 | 3
  /** Rotated 180° (top row, so it reads upright after folding). */
  rotated: boolean
}

/**
 * Single-sheet 8-page mini-zine on a landscape sheet, 2 rows × 4 columns.
 * Top row (rotated):  5 4 3 2
 * Bottom row:         6 7 8 1
 */
export const MINI_LAYOUT: MiniCell[] = [
  { page: 5, row: 0, col: 0, rotated: true },
  { page: 4, row: 0, col: 1, rotated: true },
  { page: 3, row: 0, col: 2, rotated: true },
  { page: 2, row: 0, col: 3, rotated: true },
  { page: 6, row: 1, col: 0, rotated: false },
  { page: 7, row: 1, col: 1, rotated: false },
  { page: 8, row: 1, col: 2, rotated: false },
  { page: 1, row: 1, col: 3, rotated: false },
]

export interface SheetSide {
  left: number
  right: number
}

export interface Sheet {
  front: SheetSide
  back: SheetSide
}

export const padToMultiple = (n: number, k: number) => Math.ceil(n / k) * k

/**
 * Saddle-stitch sheets for N pages (N must be a multiple of 4).
 * Sheet i: front [N−2i, 2i+1], back [2i+2, N−2i−1].
 */
export function saddleStitch(n: number): Sheet[] {
  if (n <= 0 || n % 4 !== 0) throw new Error(`saddleStitch needs a multiple of 4, got ${n}`)
  return Array.from({ length: n / 4 }, (_, i) => ({
    front: { left: n - 2 * i, right: 2 * i + 1 },
    back: { left: 2 * i + 2, right: n - 2 * i - 1 },
  }))
}

/**
 * Where to put blank pages when padding a booklet: before the back cover,
 * so page 1 stays the cover and the last page stays the back cover.
 * Returns the reading order as indices into the original pages, null = blank.
 */
export function paddedOrder(count: number, multiple = 4): (number | null)[] {
  const total = padToMultiple(Math.max(count, multiple), multiple)
  const blanks = total - count
  if (blanks === 0) return Array.from({ length: count }, (_, i) => i)
  if (count < 2) return [...Array.from({ length: count }, (_, i) => i), ...Array(blanks).fill(null)]
  return [
    ...Array.from({ length: count - 1 }, (_, i) => i),
    ...Array(blanks).fill(null),
    count - 1,
  ]
}

/** Reading spreads for the on-screen preview: cover alone, then pairs, back cover alone. */
export function readingSpreads(n: number): number[][] {
  if (n <= 0) return []
  const out: number[][] = [[1]]
  for (let p = 2; p <= n; p += 2) out.push(p === n ? [p] : [p, p + 1])
  return out
}

export interface SheetCell {
  /** Index into the project's pages, or null for a padding blank. */
  page: number | null
  /** 1-based position in the printed order, for labels. */
  number: number
  /** mm from the sheet's top-left. */
  x: number
  y: number
  w: number
  h: number
  rotated: boolean
}

export interface PrintSide {
  sheet: number
  side: 'front' | 'back' | 'single'
  cells: SheetCell[]
}

/**
 * Every printed side, with each page's position on it. One source for the
 * on-screen proof and the PDF, so what you see is what prints.
 */
export function sheetSides(
  format: 'mini' | 'booklet' | 'loose',
  sheet: { w: number; h: number },
  count: number,
): PrintSide[] {
  if (format === 'mini') {
    const w = sheet.w / 4
    const h = sheet.h / 2
    return [
      {
        sheet: 0,
        side: 'single',
        cells: MINI_LAYOUT.map((c) => ({
          page: c.page <= count ? c.page - 1 : null,
          number: c.page,
          x: c.col * w,
          y: c.row * h,
          w,
          h,
          rotated: c.rotated,
        })),
      },
    ]
  }
  if (format === 'booklet') {
    const order = paddedOrder(count, 4)
    const w = sheet.w / 2
    const cell = (n: number, x: number): SheetCell => ({ page: order[n - 1], number: n, x, y: 0, w, h: sheet.h, rotated: false })
    return saddleStitch(order.length).flatMap((s, i) => [
      { sheet: i, side: 'front' as const, cells: [cell(s.front.left, 0), cell(s.front.right, w)] },
      { sheet: i, side: 'back' as const, cells: [cell(s.back.left, 0), cell(s.back.right, w)] },
    ])
  }
  return Array.from({ length: count }, (_, i) => ({
    sheet: i,
    side: 'single' as const,
    cells: [{ page: i, number: i + 1, x: 0, y: 0, w: sheet.w, h: sheet.h, rotated: false }],
  }))
}

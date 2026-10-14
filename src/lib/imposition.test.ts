import { describe, expect, it } from 'vitest'
import { MINI_LAYOUT, padToMultiple, paddedOrder, readingSpreads, saddleStitch } from './imposition'
import { cropRect, effectiveDpi, rasterSize } from './crop'
import { slotsFor } from './templates'

describe('mini-zine', () => {
  it('places pages 5 4 3 2 / 6 7 8 1 with the top row rotated', () => {
    const grid = [0, 1].map((row) =>
      MINI_LAYOUT.filter((c) => c.row === row)
        .sort((a, b) => a.col - b.col)
        .map((c) => c.page),
    )
    expect(grid).toEqual([
      [5, 4, 3, 2],
      [6, 7, 8, 1],
    ])
    expect(MINI_LAYOUT.filter((c) => c.rotated).map((c) => c.page).sort()).toEqual([2, 3, 4, 5])
  })

  it('uses every page exactly once', () => {
    expect(MINI_LAYOUT.map((c) => c.page).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('saddle stitch', () => {
  it('orders 8 pages as [8,1]/[2,7] and [6,3]/[4,5]', () => {
    expect(saddleStitch(8)).toEqual([
      { front: { left: 8, right: 1 }, back: { left: 2, right: 7 } },
      { front: { left: 6, right: 3 }, back: { left: 4, right: 5 } },
    ])
  })

  it.each([4, 12, 16, 24, 48])('pairs facing pages to sum N+1 for %i pages', (n) => {
    const sheets = saddleStitch(n)
    expect(sheets).toHaveLength(n / 4)
    const all = sheets.flatMap((s) => [s.front.left, s.front.right, s.back.left, s.back.right])
    expect(new Set(all).size).toBe(n)
    for (const s of sheets) {
      expect(s.front.left + s.front.right).toBe(n + 1)
      expect(s.back.left + s.back.right).toBe(n + 1)
    }
  })

  it('rejects counts that are not a multiple of 4', () => {
    expect(() => saddleStitch(10)).toThrow()
  })
})

describe('padding', () => {
  it('pads to the next multiple of 4', () => {
    expect(padToMultiple(10, 4)).toBe(12)
    expect(padToMultiple(12, 4)).toBe(12)
  })

  it('inserts blanks before the back cover', () => {
    expect(paddedOrder(10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, null, null, 9])
    expect(paddedOrder(8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})

describe('reading spreads', () => {
  it('shows the cover and back cover alone', () => {
    expect(readingSpreads(8)).toEqual([[1], [2, 3], [4, 5], [6, 7], [8]])
    expect(readingSpreads(7)).toEqual([[1], [2, 3], [4, 5], [6, 7]])
  })
})

describe('crop and dpi', () => {
  it('covers the slot and centres by default', () => {
    const c = cropRect(4000, 3000, 1, { zoom: 1, fx: 0.5, fy: 0.5 })
    expect(c).toEqual({ x: 500, y: 0, w: 3000, h: 3000 })
  })

  it('computes effective dpi from the crop width', () => {
    const c = cropRect(3000, 3000, 1, { zoom: 1, fx: 0.5, fy: 0.5 })
    expect(effectiveDpi(c, 254)).toBe(300)
  })

  it('never upscales past the source crop', () => {
    const c = cropRect(600, 600, 1, { zoom: 1, fx: 0.5, fy: 0.5 })
    expect(rasterSize(c, 254, 254)).toEqual({ w: 600, h: 600 })
  })

  it('extends bleed slots past the trim box', () => {
    const [s] = slotsFor('bleed', { w: 148.5, h: 210 }, 3)
    expect(s).toMatchObject({ x: -3, y: -3, w: 154.5, h: 216 })
  })
})

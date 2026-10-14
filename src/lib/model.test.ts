import { describe, expect, it } from 'vitest'
import { blankFill, createProject, swapFills, withFormat } from './model'

describe('withFormat', () => {
  it('keeps every page when leaving a mini-zine', () => {
    const mini = createProject('mini', 'letter')
    const booklet = withFormat(mini, 'booklet')
    expect(booklet.format).toBe('booklet')
    expect(booklet.pages.map((p) => p.id)).toEqual(mini.pages.map((p) => p.id))
  })

  it('trims to 8 pages for a mini-zine, keeping the cover and back cover', () => {
    const booklet = createProject('booklet', 'letter')
    const ids = booklet.pages.map((p) => p.id)
    const mini = withFormat(booklet, 'mini')
    expect(mini.pages).toHaveLength(8)
    expect(mini.pages[0].id).toBe(ids[0])
    expect(mini.pages[7].id).toBe(ids[ids.length - 1])
  })

  it('pads to 8 pages with blanks before the back cover', () => {
    const loose = { ...createProject('loose', 'a4'), pages: createProject('loose', 'a4').pages.slice(0, 3) }
    const ids = loose.pages.map((p) => p.id)
    const mini = withFormat(loose, 'mini')
    expect(mini.pages).toHaveLength(8)
    expect(mini.pages[0].id).toBe(ids[0])
    expect(mini.pages[1].id).toBe(ids[1])
    expect(mini.pages[7].id).toBe(ids[2])
  })

  it('is a no-op for the same format', () => {
    const p = createProject('booklet', 'letter')
    expect(withFormat(p, 'booklet')).toBe(p)
  })
})

describe('swapFills', () => {
  const base = () => {
    const p = createProject('mini', 'letter')
    p.pages[1].fills = [blankFill('a')]
    p.pages[2].fills = [blankFill('b')]
    return p
  }

  it('swaps two photos', () => {
    const p = swapFills(base(), { page: 1, slot: 0 }, { page: 2, slot: 0 })
    expect(p.pages[1].fills[0]?.photoId).toBe('b')
    expect(p.pages[2].fills[0]?.photoId).toBe('a')
  })

  it('moves a photo into an empty slot', () => {
    const p = swapFills(base(), { page: 1, slot: 0 }, { page: 3, slot: 0 })
    expect(p.pages[1].fills[0]).toBeNull()
    expect(p.pages[3].fills[0]?.photoId).toBe('a')
  })

  it('ignores slots that do not exist', () => {
    const p = base()
    expect(swapFills(p, { page: 1, slot: 0 }, { page: 1, slot: 5 })).toBe(p)
  })
})

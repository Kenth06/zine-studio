import { describe, expect, it } from 'vitest'
import { createProject, withFormat } from './model'

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

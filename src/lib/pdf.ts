import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import { cropRect, rasterSize } from './crop'
import { FORMATS, PAPER, pt } from './formats'
import { MINI_LAYOUT, paddedOrder, saddleStitch } from './imposition'
import { bleedFor, type Project } from './model'
import { slotsFor, textSizePt, type Slot } from './templates'

export type ExportMode = 'print' | 'read'
export type Progress = (done: number, total: number) => void

/** Slug outside the bleed where crop marks are drawn, in mm. */
const SLUG = 8
const MARK_GAP = 1
const MARK_LEN = 5

/** Runs in a Web Worker: decode, crop and re-encode one slot at print resolution. */
async function rasterize(blob: Blob, fill: NonNullable<Project['pages'][0]['fills'][0]>, slot: Slot) {
  const bmp = await createImageBitmap(blob)
  try {
    const crop = cropRect(bmp.width, bmp.height, slot.w / slot.h, fill)
    const size = rasterSize(crop, slot.w, slot.h)
    const canvas = new OffscreenCanvas(size.w, size.h)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, crop.x, crop.y, crop.w, crop.h, 0, 0, size.w, size.h)
    // Re-encoding through a canvas drops EXIF, including GPS location.
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    return new Uint8Array(await out.arrayBuffer())
  } finally {
    bmp.close()
  }
}

const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const printable = (s: string) => [...s].map((c) => (c === '\n' || (c >= ' ' && c <= 'ÿ') || WIN_ANSI_EXTRA.has(c) ? c : '?')).join('')

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, top: number, w: number, h: number, size: number) {
  const lead = size * 1.35
  const lines: string[] = []
  for (const para of printable(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= w || !line) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  const max = Math.floor(h / lead)
  lines.slice(0, max).forEach((l, i) =>
    page.drawText(l, { x, y: top - size - i * lead, size, font, color: rgb(0.145, 0.141, 0.122) }),
  )
}

function drawCropMarks(page: PDFPage, o: number, tw: number, th: number, bleed: number) {
  const H = page.getHeight() / pt(1)
  const off = bleed + MARK_GAP
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: pt(x1), y: pt(H - y1) }, end: { x: pt(x2), y: pt(H - y2) }, thickness: 0.25, color: rgb(0, 0, 0) })
  for (const x of [o, o + tw]) {
    line(x, o - off - MARK_LEN, x, o - off)
    line(x, o + th + off, x, o + th + off + MARK_LEN)
  }
  for (const y of [o, o + th]) {
    line(o - off - MARK_LEN, y, o - off, y)
    line(o + tw + off, y, o + tw + off + MARK_LEN, y)
  }
}

/** One PDF page per zine page, at trim size (+ bleed and slug when asked). */
async function buildPages(project: Project, photos: Map<string, Blob>, bleed: number, marks: boolean, progress: Progress) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const trim = FORMATS[project.format].pageSize(project.paper)
  const o = bleed + (marks ? SLUG : 0)
  const W = trim.w + 2 * o
  const H = trim.h + 2 * o
  const size = textSizePt(trim)

  for (const [i, zp] of project.pages.entries()) {
    const page = doc.addPage([pt(W), pt(H)])
    if (bleed || marks) {
      page.setTrimBox(pt(o), pt(o), pt(trim.w), pt(trim.h))
      page.setBleedBox(pt(o - bleed), pt(o - bleed), pt(trim.w + 2 * bleed), pt(trim.h + 2 * bleed))
    }
    let photoIdx = 0
    for (const slot of slotsFor(zp.template, trim, bleed)) {
      const x = pt(o + slot.x)
      const y = pt(H - (o + slot.y + slot.h))
      if (slot.kind === 'text') {
        if (zp.text.trim()) drawText(page, font, zp.text, x, pt(H - (o + slot.y)), pt(slot.w), pt(slot.h), size)
        continue
      }
      const fill = zp.fills[photoIdx++]
      const blob = fill && photos.get(fill.photoId)
      if (!fill || !blob) continue
      const img = await doc.embedJpg(await rasterize(blob, fill, slot))
      page.drawImage(img, { x, y, width: pt(slot.w), height: pt(slot.h) })
    }
    if (marks) drawCropMarks(page, o, trim.w, trim.h, bleed)
    progress(i + 1, project.pages.length)
  }
  return doc
}

async function imposeMini(project: Project, pages: PDFDocument) {
  const out = await PDFDocument.create()
  const sheet = PAPER[project.paper]
  const cw = pt(sheet.w / 4)
  const ch = pt(sheet.h / 2)
  const embedded = await out.embedPdf(await pages.save(), pages.getPageIndices())
  const page = out.addPage([pt(sheet.w), pt(sheet.h)])
  for (const cell of MINI_LAYOUT) {
    const x = cell.col * cw
    const y = cell.row === 0 ? ch : 0
    const src = embedded[cell.page - 1]
    if (cell.rotated) page.drawPage(src, { x: x + cw, y: y + ch, width: cw, height: ch, rotate: degrees(180) })
    else page.drawPage(src, { x, y, width: cw, height: ch })
  }
  return out
}

async function imposeBooklet(project: Project, pages: PDFDocument) {
  const out = await PDFDocument.create()
  const sheet = PAPER[project.paper]
  const pw = pt(sheet.w / 2)
  const ph = pt(sheet.h)
  const embedded = await out.embedPdf(await pages.save(), pages.getPageIndices())
  const order = paddedOrder(project.pages.length, 4)
  const at = (n: number) => {
    const idx = order[n - 1]
    return idx === null ? null : embedded[idx]
  }
  for (const s of saddleStitch(order.length)) {
    for (const side of [s.front, s.back]) {
      const page = out.addPage([pt(sheet.w), pt(sheet.h)])
      const l = at(side.left)
      const r = at(side.right)
      if (l) page.drawPage(l, { x: 0, y: 0, width: pw, height: ph })
      if (r) page.drawPage(r, { x: pw, y: 0, width: pw, height: ph })
    }
  }
  return out
}

export async function buildPdf(project: Project, photos: Map<string, Blob>, mode: ExportMode, progress: Progress) {
  const bleed = mode === 'print' ? bleedFor(project) : 0
  const marks = mode === 'print' && project.format === 'loose' && project.cropMarks
  const pages = await buildPages(project, photos, bleed, marks, progress)
  let doc = pages
  if (mode === 'print' && project.format === 'mini') doc = await imposeMini(project, pages)
  if (mode === 'print' && project.format === 'booklet') doc = await imposeBooklet(project, pages)
  doc.setTitle('Zine')
  doc.setProducer('Zine Studio')
  doc.setCreator('Zine Studio')
  return doc.save()
}

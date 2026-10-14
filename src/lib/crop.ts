import { MM_PER_IN } from './formats'

export interface PhotoFill {
  photoId: string
  /** 1 = cover; larger values zoom in. */
  zoom: number
  /** Position of the crop inside the free space, 0..1 on each axis. */
  fx: number
  fy: number
}

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export const MAX_ZOOM = 3
export const PRINT_DPI = 300
export const DPI_WARN = 200
export const DPI_BAD = 150

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Source-pixel crop for a photo of size pw×ph placed in a slot of aspect `aspect` (w/h). */
export function cropRect(pw: number, ph: number, aspect: number, fill: Pick<PhotoFill, 'zoom' | 'fx' | 'fy'>): CropRect {
  let w: number
  let h: number
  if (pw / ph > aspect) {
    h = ph
    w = ph * aspect
  } else {
    w = pw
    h = pw / aspect
  }
  const z = clamp(fill.zoom, 1, MAX_ZOOM)
  w /= z
  h /= z
  return { x: (pw - w) * clamp(fill.fx, 0, 1), y: (ph - h) * clamp(fill.fy, 0, 1), w, h }
}

/** Effective resolution of the crop once printed at slot width (mm). */
export function effectiveDpi(crop: CropRect, slotWmm: number) {
  return Math.round(crop.w / (slotWmm / MM_PER_IN))
}

export type DpiLevel = 'ok' | 'warn' | 'bad'
export const dpiLevel = (dpi: number): DpiLevel => (dpi < DPI_BAD ? 'bad' : dpi < DPI_WARN ? 'warn' : 'ok')

/** Pixel size to rasterize a slot at for print: 300 DPI, never upscaled past the crop. */
export function rasterSize(crop: CropRect, slotWmm: number, slotHmm: number) {
  const target = (slotWmm / MM_PER_IN) * PRINT_DPI
  const w = Math.max(1, Math.round(Math.min(target, crop.w)))
  const h = Math.max(1, Math.round((w * slotHmm) / slotWmm))
  return { w, h }
}

/** Move the crop by a drag of (dx, dy) screen px inside a slot that is slotPxW wide. */
export function panFill(
  fill: PhotoFill,
  pw: number,
  ph: number,
  aspect: number,
  dx: number,
  dy: number,
  slotPxW: number,
): PhotoFill {
  const c = cropRect(pw, ph, aspect, fill)
  const srcPerPx = c.w / slotPxW
  const freeX = pw - c.w
  const freeY = ph - c.h
  return {
    ...fill,
    fx: freeX > 0.5 ? clamp(fill.fx - (dx * srcPerPx) / freeX, 0, 1) : 0.5,
    fy: freeY > 0.5 ? clamp(fill.fy - (dy * srcPerPx) / freeY, 0, 1) : 0.5,
  }
}

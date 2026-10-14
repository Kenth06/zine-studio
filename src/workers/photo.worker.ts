/** Decodes a photo off the main thread and makes a small preview for the editor. */

export interface PhotoRequest {
  id: string
  blob: Blob
}

export type PhotoResponse =
  | { id: string; ok: true; w: number; h: number; thumb: Blob }
  | { id: string; ok: false; error: string }

const PREVIEW_EDGE = 512

const ctx = self as unknown as {
  onmessage: (e: MessageEvent<PhotoRequest>) => void
  postMessage: (msg: PhotoResponse) => void
}

ctx.onmessage = async ({ data: { id, blob } }) => {
  try {
    const bmp = await createImageBitmap(blob)
    const scale = Math.min(1, PREVIEW_EDGE / Math.max(bmp.width, bmp.height))
    const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale))
    const g = canvas.getContext('2d')!
    g.imageSmoothingQuality = 'high'
    g.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const thumb = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
    ctx.postMessage({ id, ok: true, w: bmp.width, h: bmp.height, thumb })
    bmp.close()
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}

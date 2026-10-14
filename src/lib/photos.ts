import type { PhotoRequest, PhotoResponse } from '../workers/photo.worker'
import type { ExportRequest, ExportResponse } from '../workers/export.worker'
import type { ExportMode } from './pdf'
import { uid, type PhotoMeta, type Project } from './model'
import { loadPhoto, savePhoto } from './storage'

const ACCEPTED = /^image\/(jpeg|png|webp|heic|heif|avif)$/
const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)
export const isPhotoFile = (f: File) => ACCEPTED.test(f.type) || isHeic(f)

let photoWorker: Worker | undefined
const pending = new Map<string, (r: PhotoResponse) => void>()

function decode(id: string, blob: Blob) {
  photoWorker ??= new Worker(new URL('../workers/photo.worker.ts', import.meta.url), { type: 'module' })
  photoWorker.onmessage = (e: MessageEvent<PhotoResponse>) => {
    pending.get(e.data.id)?.(e.data)
    pending.delete(e.data.id)
  }
  return new Promise<PhotoResponse>((resolve) => {
    pending.set(id, resolve)
    photoWorker!.postMessage({ id, blob } satisfies PhotoRequest)
  })
}

/** HEIC needs a decoder in Chrome and Firefox; it is only downloaded when a HEIC shows up. */
async function heicToJpeg(file: Blob) {
  const { default: heic2any } = await import('heic2any')
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 })
  return Array.isArray(out) ? out[0] : out
}

/** The browser refused to store more data. Importing more will fail the same way. */
export class StorageFullError extends Error {
  constructor() {
    super('No queda espacio en este navegador. Quita fotos que no uses o empieza un zine nuevo.')
  }
}

export interface ImportResult {
  meta: PhotoMeta
  thumb: Blob
}

export async function importPhoto(file: File): Promise<ImportResult> {
  const id = uid()
  let blob: Blob = file
  let res = await decode(id, blob)
  if (!res.ok && isHeic(file)) {
    blob = await heicToJpeg(file)
    res = await decode(id, blob)
  }
  if (!res.ok) throw new Error(`${file.name} no es una imagen que este navegador pueda abrir.`)
  try {
    await savePhoto(id, blob, res.thumb)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') throw new StorageFullError()
    throw err
  }
  return { meta: { id, name: file.name, w: res.w, h: res.h }, thumb: res.thumb }
}

export interface ExportJob {
  onProgress: (done: number, total: number) => void
}

export async function exportPdf(project: Project, mode: ExportMode, job: ExportJob) {
  const ids = new Set(project.pages.flatMap((p) => p.fills.filter(Boolean).map((f) => f!.photoId)))
  const photos: [string, Blob][] = []
  for (const id of ids) {
    const blob = await loadPhoto(id)
    if (blob) photos.push([id, blob])
  }
  const worker = new Worker(new URL('../workers/export.worker.ts', import.meta.url), { type: 'module' })
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<ExportResponse>) => {
        if (e.data.type === 'progress') job.onProgress(e.data.done, e.data.total)
        else if (e.data.type === 'done') resolve(e.data.bytes)
        else reject(new Error(e.data.error))
      }
      worker.onerror = (e) => reject(new Error(e.message))
      worker.postMessage({ project, photos, mode } satisfies ExportRequest)
    })
  } finally {
    worker.terminate()
  }
}

export function download(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

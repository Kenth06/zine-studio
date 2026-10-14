import { buildPdf, type ExportMode } from '../lib/pdf'
import type { Project } from '../lib/model'

export interface ExportRequest {
  project: Project
  photos: [string, Blob][]
  mode: ExportMode
}

export type ExportResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; error: string }

const ctx = self as unknown as {
  onmessage: (e: MessageEvent<ExportRequest>) => void
  postMessage: (msg: ExportResponse, transfer?: Transferable[]) => void
}

ctx.onmessage = async ({ data }) => {
  try {
    const bytes = await buildPdf(data.project, new Map(data.photos), data.mode, (done, total) =>
      ctx.postMessage({ type: 'progress', done, total }),
    )
    ctx.postMessage({ type: 'done', bytes }, [bytes.buffer])
  } catch (err) {
    ctx.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) })
  }
}

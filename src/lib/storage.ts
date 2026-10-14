import { clear, del, delMany, get, keys, set } from 'idb-keyval'
import type { Project } from './model'

/**
 * Everything lives in this browser's IndexedDB. There is no server to send it to.
 * Keys: `project` (JSON), `photo:<id>` (original Blob), `thumb:<id>` (editing preview Blob).
 */

export const loadProject = () => get<Project>('project')
export const saveProject = (p: Project) => set('project', p)

export const savePhoto = (id: string, original: Blob, thumb: Blob) =>
  Promise.all([set(`photo:${id}`, original), set(`thumb:${id}`, thumb)])

export const loadPhoto = (id: string) => get<Blob>(`photo:${id}`)
export const loadThumb = (id: string) => get<Blob>(`thumb:${id}`)

export const deletePhoto = (id: string) => Promise.all([del(`photo:${id}`), del(`thumb:${id}`)])

/** Delete stored photos that are not in `keep`. Run only when no undo history can bring them back. */
export async function collectPhotos(keep: Set<string>) {
  const stale = (await keys()).filter((k) => {
    const m = /^(photo|thumb):(.+)$/.exec(String(k))
    return m !== null && !keep.has(m[2])
  })
  if (stale.length) await delMany(stale)
}

export async function wipeEverything() {
  await clear()
  try {
    const root = await navigator.storage?.getDirectory?.()
    if (root) for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) await root.removeEntry(name, { recursive: true })
  } catch {
    // OPFS not available; IndexedDB is already cleared.
  }
}

export async function askPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Best effort.
  }
}

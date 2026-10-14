import { Loader } from '@cloudflare/kumo/components/loader'
import { useKumoToastManager } from '@cloudflare/kumo/components/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'
import type { FormatId, PaperId } from './lib/formats'
import { sourceKey, type PhotoMeta } from './lib/model'
import { importPhoto, isPhotoFile, StorageFullError } from './lib/photos'
import { askPersistence, collectPhotos, wipeEverything } from './lib/storage'
import { useProject, useThumbs } from './state/project'

export default function App() {
  const { project, dispatch, ready, draft, canUndo, canRedo } = useProject()
  const { urls, put } = useThumbs(project?.photos ?? [])
  const [importing, setImporting] = useState(0)
  const [started, setStarted] = useState(false)
  const toasts = useKumoToastManager()
  const photosRef = useRef<PhotoMeta[]>([])
  useEffect(() => {
    photosRef.current = project?.photos ?? []
  }, [project?.photos])

  const addFiles = useCallback(
    async (files: File[], fill: boolean) => {
      const images = files.filter(isPhotoFile)
      const skipped = files.length - images.length
      if (skipped) toasts.add({ title: `${skipped} ${skipped === 1 ? 'archivo no es' : 'archivos no son'} una foto`, variant: 'warning' })
      // Dropping the same folder twice is common; keep one copy of each file.
      const known = new Set(photosRef.current.map((p) => p.source).filter(Boolean))
      const photos = images.filter((f) => !known.has(sourceKey(f)))
      const repeated = images.length - photos.length
      if (repeated) toasts.add({ title: `${repeated} ${repeated === 1 ? 'foto ya estaba' : 'fotos ya estaban'} en el zine` })
      if (!photos.length) return []
      void askPersistence()
      setImporting((n) => n + photos.length)
      const added: PhotoMeta[] = []
      for (const file of photos) {
        try {
          const { meta, thumb } = await importPhoto(file)
          put(meta.id, thumb)
          added.push(meta)
        } catch (err) {
          const full = err instanceof StorageFullError
          toasts.add({
            title: full ? 'No hay espacio para más fotos' : 'No se pudo añadir una foto',
            description: err instanceof Error ? err.message : file.name,
            variant: 'error',
          })
          if (full) {
            setImporting(0)
            break
          }
        } finally {
          setImporting((n) => Math.max(0, n - 1))
        }
      }
      dispatch({ type: 'addPhotos', photos: added, fill })
      return added
    },
    [dispatch, put, toasts],
  )

  if (!ready)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )

  if (!project || !started)
    return (
      <StartScreen
        draft={project ?? draft}
        onResume={() => {
          if (!project) dispatch({ type: 'load', project: draft })
          setStarted(true)
        }}
        onStart={async (format: FormatId, paper: PaperId, files) => {
          // The previous draft is replaced and has no undo history: free its photos first.
          await collectPhotos(new Set())
          dispatch({ type: 'create', format, paper })
          setStarted(true)
          if (files.length) void addFiles(files, true)
        }}
      />
    )

  return (
    <Editor
      project={project}
      dispatch={dispatch}
      thumbs={urls}
      importing={importing}
      onFiles={addFiles}
      canUndo={canUndo}
      canRedo={canRedo}
      onNew={() => setStarted(false)}
      onWipe={async () => {
        await wipeEverything()
        dispatch({ type: 'reset' })
        setStarted(false)
        toasts.add({ title: 'Todo borrado de este navegador' })
      }}
    />
  )
}

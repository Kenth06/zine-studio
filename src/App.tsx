import { Loader } from '@cloudflare/kumo/components/loader'
import { useKumoToastManager } from '@cloudflare/kumo/components/toast'
import { useCallback, useState } from 'react'
import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'
import type { FormatId, PaperId } from './lib/formats'
import type { PhotoMeta } from './lib/model'
import { importPhoto, isPhotoFile } from './lib/photos'
import { askPersistence, collectPhotos, wipeEverything } from './lib/storage'
import { useProject, useThumbs } from './state/project'

export default function App() {
  const { project, dispatch, ready, draft, canUndo, canRedo } = useProject()
  const { urls, put } = useThumbs(project?.photos ?? [])
  const [importing, setImporting] = useState(0)
  const [started, setStarted] = useState(false)
  const toasts = useKumoToastManager()

  const addFiles = useCallback(
    async (files: File[], fill: boolean) => {
      const photos = files.filter(isPhotoFile)
      const skipped = files.length - photos.length
      if (skipped) toasts.add({ title: `${skipped} ${skipped === 1 ? 'archivo no es' : 'archivos no son'} una foto`, variant: 'warning' })
      if (!photos.length) return
      void askPersistence()
      setImporting((n) => n + photos.length)
      const added: PhotoMeta[] = []
      for (const file of photos) {
        try {
          const { meta, thumb } = await importPhoto(file)
          put(meta.id, thumb)
          added.push(meta)
        } catch (err) {
          toasts.add({ title: 'No se pudo leer una foto', description: err instanceof Error ? err.message : file.name, variant: 'error' })
        } finally {
          setImporting((n) => n - 1)
        }
      }
      dispatch({ type: 'addPhotos', photos: added, fill })
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

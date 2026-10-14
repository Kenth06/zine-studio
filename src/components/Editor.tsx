import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { useKumoToastManager } from '@cloudflare/kumo/components/toast'
import { DownloadSimpleIcon, WarningIcon } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { cropRect, dpiLevel, effectiveDpi } from '../lib/crop'
import { FORMATS, summary, type PaperId } from '../lib/formats'
import { padToMultiple, readingSpreads } from '../lib/imposition'
import { bleedFor, photoUsages, type Project } from '../lib/model'
import { slotsFor } from '../lib/templates'
import type { Action } from '../state/project'
import { ExportDialog } from './ExportDialog'
import { Inspector } from './Inspector'
import { PageView } from './PageView'
import { PhotoTray } from './PhotoTray'
import { Slug } from './Slug'

interface Props {
  project: Project
  dispatch: Dispatch<Action>
  thumbs: Record<string, string>
  importing: number
  onFiles: (files: File[], fill: boolean) => void
  onRemovePhoto: (id: string) => void
  onNew: () => void
  onWipe: () => Promise<void>
}

export function Editor({ project, dispatch, thumbs, importing, onFiles, onRemovePhoto, onNew, onWipe }: Props) {
  const toasts = useKumoToastManager()
  const [sel, setSel] = useState<{ page: number; slot: number | null }>({ page: 0, slot: null })
  const [exporting, setExporting] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [canvasW, setCanvasW] = useState(800)
  const canvasRef = useRef<HTMLDivElement>(null)

  const format = FORMATS[project.format]
  const size = format.pageSize(project.paper)
  const bleed = bleedFor(project)
  const total = project.pages.length
  const page = Math.min(sel.page, total - 1)
  const photos = useMemo(() => new Map(project.photos.map((p) => [p.id, p])), [project.photos])

  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCanvasW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pxPerMm = Math.min(380 / size.h, (canvasW - 48) / (2 * size.w + 4))

  // Effective DPI per used photo, for the tray badges and the export summary.
  const { worstDpi, lowDpi, emptySlots } = useMemo(() => {
    const worst = new Map<string, number>()
    let empty = 0
    for (const pg of project.pages) {
      const slots = slotsFor(pg.template, size, bleed).filter((s) => s.kind === 'photo')
      slots.forEach((s, i) => {
        const f = pg.fills[i]
        const meta = f && photos.get(f.photoId)
        if (!f || !meta) return void empty++
        const dpi = effectiveDpi(cropRect(meta.w, meta.h, s.w / s.h, f), s.w)
        worst.set(f.photoId, Math.min(worst.get(f.photoId) ?? Infinity, dpi))
      })
    }
    const low = [...worst.values()].filter((d) => dpiLevel(d) !== 'ok').length
    return { worstDpi: worst, lowDpi: low, emptySlots: empty }
  }, [project.pages, photos, size, bleed])

  // Drop files anywhere, or paste them.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) onFiles(files, true)
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return
      e.preventDefault()
      onFiles([...e.dataTransfer.files], true)
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFiles])

  const usages = useMemo(() => photoUsages(project), [project])
  const missing = project.format === 'booklet' ? padToMultiple(total, 4) - total : 0

  const pick = (photoId: string) => {
    if (sel.slot !== null && sel.slot < project.pages[page].fills.length) {
      dispatch({ type: 'assign', page, slot: sel.slot, photoId })
      return
    }
    // No slot chosen: use the first empty one from the selected page onwards.
    for (let k = 0; k < total; k++) {
      const pi = (page + k) % total
      const si = project.pages[pi].fills.findIndex((f) => !f)
      if (si >= 0) {
        dispatch({ type: 'assign', page: pi, slot: si, photoId })
        setSel({ page: pi, slot: si })
        return
      }
    }
    toasts.add({ title: 'No quedan huecos vacíos', description: 'Elige un hueco para reemplazar su foto.' })
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-4 border-b border-kumo-hairline bg-kumo-base px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <button onClick={onNew} className="text-[15px] font-semibold tracking-tight text-kumo-default">
            zine studio
          </button>
          <Slug className="hidden truncate sm:inline">{summary(project.format, project.paper, total)}</Slug>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            size="sm"
            value={project.paper}
            onValueChange={(v) => dispatch({ type: 'setPaper', paper: v as PaperId })}
            tabs={[
              { value: 'letter', label: 'Carta' },
              { value: 'a4', label: 'A4' },
            ]}
          />
          <Button variant="primary" size="sm" icon={DownloadSimpleIcon} onClick={() => setExporting(true)}>
            Exportar
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[248px_minmax(0,1fr)_288px]">
        <aside className="order-3 flex flex-col gap-3 border-kumo-hairline p-3 lg:min-h-0 lg:order-1 lg:border-r">
          <PhotoTray
            photos={project.photos}
            thumbs={thumbs}
            worstDpi={worstDpi}
            importing={importing}
            canAssign={sel.slot !== null}
            onFiles={(f) => onFiles(f, true)}
            onPick={pick}
            onRemove={(id) => {
              const n = usages.get(id)?.length ?? 0
              onRemovePhoto(id)
              if (n) toasts.add({ title: `Foto quitada de ${n} ${n === 1 ? 'hueco' : 'huecos'}` })
            }}
          />
          <div className="flex flex-col gap-1 px-1">
            <p className="text-xs leading-snug text-kumo-subtle">Nada se sube. Las fotos se quedan en este navegador.</p>
            <button onClick={() => setConfirmWipe(true)} className="self-start text-xs text-kumo-subtle underline decoration-kumo-interact underline-offset-2 hover:text-kumo-danger">
              Borrar todo de este navegador
            </button>
          </div>
        </aside>

        <main ref={canvasRef} className="order-1 bg-kumo-recessed lg:min-h-0 lg:overflow-y-auto lg:order-2" onClick={(e) => e.target === e.currentTarget && setSel((s) => ({ ...s, slot: null }))}>
          {missing > 0 && (
            <div className="z-10 p-3 lg:sticky lg:top-0">
              <Banner
                variant="alert"
                icon={<WarningIcon weight="fill" />}
                title={`Faltan ${missing} ${missing === 1 ? 'página' : 'páginas'} para completar el pliego`}
                description="Un cuadernillo necesita múltiplos de 4. Si no las añades, saldrán en blanco antes de la contraportada."
                action={
                  <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'addPage', after: total - 2, count: missing })}>
                    Añadir {missing}
                  </Button>
                }
              />
            </div>
          )}
          <div className="flex flex-col items-center gap-10 px-6 py-10">
            {readingSpreads(total).map((spread) => (
              <figure key={spread.join('-')} className="flex flex-col items-center gap-3">
                <div className={spread.length === 1 && spread[0] === 1 ? 'flex justify-end' : 'flex'} style={{ gap: 2 }}>
                  {spread.length === 1 && spread[0] === 1 && <div style={{ width: size.w * pxPerMm }} aria-hidden />}
                  {spread.map((n) => (
                    <PageView
                      key={project.pages[n - 1].id}
                      page={project.pages[n - 1]}
                      number={n}
                      size={size}
                      bleed={bleed}
                      pxPerMm={pxPerMm}
                      photos={photos}
                      thumbs={thumbs}
                      selected={page === n - 1}
                      selectedSlot={page === n - 1 ? sel.slot : null}
                      onSelect={(slot) => setSel({ page: n - 1, slot })}
                      onAssign={(slot, photoId) => dispatch({ type: 'assign', page: n - 1, slot, photoId })}
                      onFill={(slot, fill) => dispatch({ type: 'updateFill', page: n - 1, slot, fill })}
                      onClear={(slot) => dispatch({ type: 'clearSlot', page: n - 1, slot })}
                    />
                  ))}
                  {spread.length === 1 && spread[0] !== 1 && spread[0] % 2 === 0 && <div style={{ width: size.w * pxPerMm }} aria-hidden />}
                </div>
                <figcaption>
                  <Slug>{spread.map((n) => (n === 1 ? 'Portada' : n === total ? 'Contraportada' : n)).join(' · ')}</Slug>
                </figcaption>
              </figure>
            ))}
          </div>
        </main>

        <aside className="order-2 border-kumo-hairline p-3 lg:min-h-0 lg:overflow-y-auto lg:order-3 lg:border-l">
          <Inspector
            page={project.pages[page]}
            index={page}
            total={total}
            size={size}
            bleed={bleed}
            fixedPages={!!format.fixedPages}
            slot={sel.slot}
            photos={photos}
            thumbs={thumbs}
            onTemplate={(template) => {
              dispatch({ type: 'setTemplate', page, template })
              setSel({ page, slot: null })
            }}
            onMove={(to) => {
              dispatch({ type: 'movePage', from: page, to })
              setSel({ page: to, slot: null })
            }}
            onAdd={() => {
              dispatch({ type: 'addPage', after: page })
              setSel({ page: page + 1, slot: null })
            }}
            onRemove={() => {
              dispatch({ type: 'removePage', page })
              setSel({ page: Math.max(0, page - 1), slot: null })
            }}
            onFill={(slot, fill) => dispatch({ type: 'updateFill', page, slot, fill })}
            onClear={(slot) => dispatch({ type: 'clearSlot', page, slot })}
            onText={(text) => dispatch({ type: 'setText', page, text })}
          />
        </aside>
      </div>

      <ExportDialog
        project={project}
        open={exporting}
        onOpenChange={setExporting}
        lowDpi={lowDpi}
        emptySlots={emptySlots}
        onPrint={(b, c) => dispatch({ type: 'setPrint', bleed: b, cropMarks: c })}
        onError={(m) => toasts.add({ title: 'No se pudo exportar', description: m, variant: 'error' })}
        onDone={(name) => toasts.add({ title: 'PDF listo', description: name, variant: 'success' })}
      />

      <Dialog.Root open={confirmWipe} onOpenChange={setConfirmWipe}>
        <Dialog size="sm" className="flex flex-col gap-4 p-6">
          <Dialog.Title className="text-base font-semibold">¿Borrar todo?</Dialog.Title>
          <Dialog.Description className="text-sm text-kumo-subtle">
            Se borran el borrador y todas las fotos guardadas en este navegador. Los PDFs que ya descargaste no se tocan.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
            <Button
              variant="destructive"
              onClick={async () => {
                await onWipe()
                setConfirmWipe(false)
              }}
            >
              Borrar todo
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </div>
  )
}

import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { DropdownMenu } from '@cloudflare/kumo/components/dropdown'
import { useKumoToastManager } from '@cloudflare/kumo/components/toast'
import { cn } from '@cloudflare/kumo/utils'
import { DotsThreeIcon, DownloadSimpleIcon, FilePlusIcon, ImagesIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { cropRect, dpiLevel, effectiveDpi } from '../lib/crop'
import { FORMATS, PAPER, summary, type PaperId } from '../lib/formats'
import { padToMultiple, readingSpreads } from '../lib/imposition'
import { bleedFor, type Project } from '../lib/model'
import { slotsFor } from '../lib/templates'
import type { Action } from '../state/project'
import { useViewport } from '../state/viewport'
import { Bar, CtaButton, Divider, Dock, FloatButton, IconButton, Segment } from './Chrome'
import { PageTools } from './PageTools'
import { PageView, PHOTO_MIME } from './PageView'
import { Proof } from './Proof'
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
  const vp = useViewport()
  const [sel, setSel] = useState<{ page: number; slot: number | null }>({ page: 0, slot: null })
  const [proof, setProof] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const format = FORMATS[project.format]
  const size = format.pageSize(project.paper)
  const bleed = bleedFor(project)
  const total = project.pages.length
  const page = Math.min(sel.page, total - 1)
  const photos = useMemo(() => new Map(project.photos.map((p) => [p.id, p])), [project.photos])
  const pxPerMm = Math.min(Math.min(vp.h * 0.6, 520) / size.h, (vp.w - 40) / (2 * size.w))

  // Effective DPI of every placed photo: drives warnings in the dock and the proof.
  const { dpiBySlot, worstDpi, lowDpi, emptySlots } = useMemo(() => {
    const bySlot = new Map<string, number>()
    const worst = new Map<string, number>()
    let empty = 0
    project.pages.forEach((pg, pi) => {
      slotsFor(pg.template, size, bleed)
        .filter((s) => s.kind === 'photo')
        .forEach((s, si) => {
          const f = pg.fills[si]
          const meta = f && photos.get(f.photoId)
          if (!f || !meta) return void empty++
          const dpi = effectiveDpi(cropRect(meta.w, meta.h, s.w / s.h, f), s.w)
          bySlot.set(`${pi}:${si}`, dpi)
          worst.set(f.photoId, Math.min(worst.get(f.photoId) ?? Infinity, dpi))
        })
    })
    const low = [...worst.values()].filter((d) => dpiLevel(d) !== 'ok').length
    return { dpiBySlot: bySlot, worstDpi: worst, lowDpi: low, emptySlots: empty }
  }, [project.pages, photos, size, bleed])

  // Drop photos anywhere, or paste them.
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

  const missing = project.format === 'booklet' ? padToMultiple(total, 4) - total : 0
  const current = project.pages[page]
  const fill = sel.slot !== null ? current.fills[sel.slot] : null
  const fillMeta = fill ? photos.get(fill.photoId) : undefined

  const pick = (photoId: string) => {
    if (sel.slot !== null && sel.slot < current.fills.length) {
      dispatch({ type: 'assign', page, slot: sel.slot, photoId })
      return
    }
    for (let k = 0; k < total; k++) {
      const pi = (page + k) % total
      const si = project.pages[pi].fills.findIndex((f) => !f)
      if (si >= 0) {
        dispatch({ type: 'assign', page: pi, slot: si, photoId })
        setSel({ page: pi, slot: si })
        return
      }
    }
    toasts.add({ title: 'No quedan huecos vacíos', description: 'Elige un hueco para cambiar su foto.' })
  }

  const deselect = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSel((s) => ({ ...s, slot: null }))
  }

  return (
    <div className="mat min-h-full" onClick={deselect}>
      <div className="fixed top-4 left-4 z-30 flex items-center gap-3 sm:left-5">
        <DropdownMenu>
          <DropdownMenu.Trigger render={<FloatButton aria-label="Menú" />}>
            <DotsThreeIcon size={18} weight="bold" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" sideOffset={8}>
            <DropdownMenu.Item icon={FilePlusIcon} onClick={onNew}>
              Nuevo zine
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={TrashIcon} variant="danger" onClick={() => setConfirmWipe(true)}>
              Borrar todo de este navegador
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <div className="hidden flex-col sm:flex">
          <span className="text-[13px] leading-tight font-semibold tracking-tight text-kumo-default">zine studio</span>
          <Slug className="leading-tight">{summary(project.format, project.paper, total)}</Slug>
        </div>
      </div>

      <div className="fixed top-4 right-4 z-30 sm:right-5">
        <CtaButton onClick={() => setProof(true)}>
          <DownloadSimpleIcon size={16} weight="bold" />
          Exportar
        </CtaButton>
      </div>

      <main className="flex flex-col items-center gap-12 px-4 pt-24 pb-44" onClick={deselect}>
        {readingSpreads(total).map((spread) => {
          const active = spread.includes(page + 1)
          const lone = spread.length === 1
          return (
            <figure key={spread.join('-')} className="flex flex-col items-center gap-3" onClick={deselect}>
              <div
                className={cn('flex gap-0.5', lone && (spread[0] === 1 ? 'justify-end' : 'justify-start'))}
                style={{ width: 2 * size.w * pxPerMm + 2 }}
              >
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
                    onFill={(slot, f) => dispatch({ type: 'updateFill', page: n - 1, slot, fill: f })}
                    onClear={(slot) => dispatch({ type: 'clearSlot', page: n - 1, slot })}
                    onText={(text) => dispatch({ type: 'setText', page: n - 1, text })}
                  />
                ))}
              </div>
              <figcaption>
                <Slug>{spread.map((n) => (n === 1 ? 'Portada' : n === total ? 'Contraportada' : String(n).padStart(2, '0'))).join(' · ')}</Slug>
              </figcaption>
              {active && (
                <PageTools
                  page={current}
                  index={page}
                  total={total}
                  size={size}
                  fixedPages={!!format.fixedPages}
                  photos={photos}
                  thumbs={thumbs}
                  photo={
                    fill && fillMeta && sel.slot !== null
                      ? { meta: fillMeta, fill, slot: sel.slot, dpi: dpiBySlot.get(`${page}:${sel.slot}`) ?? 0 }
                      : undefined
                  }
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
                  onFill={(slot, f) => dispatch({ type: 'updateFill', page, slot, fill: f })}
                  onClear={(slot) => dispatch({ type: 'clearSlot', page, slot })}
                />
              )}
            </figure>
          )
        })}
      </main>

      {missing > 0 && (
        <div className="fixed bottom-[84px] left-1/2 z-30 -translate-x-1/2">
          <Bar label="Pliego incompleto" className="pl-3">
            <span className="text-[12px] whitespace-nowrap text-kumo-default">
              Faltan {missing} {missing === 1 ? 'página' : 'páginas'} para el pliego
            </span>
            <Segment
              role="button"
              aria-checked={undefined}
              onClick={() => dispatch({ type: 'addPage', after: total - 2, count: missing })}
              className="h-7 text-kumo-default"
            >
              Añadir {missing}
            </Segment>
          </Bar>
        </div>
      )}

      <Slug className="fixed bottom-6 left-5 hidden xl:block">Nada se sube · todo pasa en este navegador</Slug>

      <Dock label="Fotos">
        {project.photos.length === 0 ? (
          <Segment role="button" aria-checked={undefined} onClick={() => input.current?.click()} className="text-kumo-default">
            <ImagesIcon size={16} />
            Elegir fotos
            <span className="hidden text-kumo-subtle sm:inline">· o suéltalas en cualquier parte</span>
          </Segment>
        ) : (
          <ul className="flex max-w-[min(60vw,640px)] gap-1.5 overflow-x-auto p-0.5" aria-label="Fotos">
            {project.photos.map((photo) => {
              const dpi = worstDpi.get(photo.id)
              const level = dpi === undefined ? null : dpiLevel(dpi)
              const placed = fill?.photoId === photo.id
              return (
                <li key={photo.id} className="relative shrink-0">
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(PHOTO_MIME, photo.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => pick(photo.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Delete' || e.key === 'Backspace') onRemovePhoto(photo.id)
                    }}
                    aria-label={`${photo.name}${dpi === undefined ? ', sin usar' : ''}`}
                    title={`${photo.name}${dpi === undefined ? ' · sin usar' : ` · ${dpi} ppp`}`}
                    className={cn(
                      'block size-10 overflow-hidden rounded-[8px] bg-kumo-recessed outline-none',
                      'transition-[box-shadow,opacity,transform] duration-(--dur-quick) ease-(--ease-out) focus-visible:ring-2 focus-visible:ring-kumo-focus active:scale-95',
                      placed ? 'ring-2 ring-kumo-contrast ring-offset-1 ring-offset-(--float-bg)' : 'ring-1 ring-(--float-ring)',
                      dpi === undefined && 'opacity-55 hover:opacity-100',
                    )}
                  >
                    {thumbs[photo.id] && <img src={thumbs[photo.id]} alt="" draggable={false} className="size-full object-cover" />}
                  </button>
                  {level && level !== 'ok' && (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-(--float-bg)',
                        level === 'bad' ? 'bg-kumo-danger' : 'bg-kumo-warning',
                      )}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <IconButton aria-label="Añadir fotos" title="Añadir fotos" onClick={() => input.current?.click()}>
          <PlusIcon size={16} />
        </IconButton>
        {importing > 0 && <Slug className="px-1 whitespace-nowrap">Leyendo {importing}…</Slug>}
        <Divider />
        <div role="radiogroup" aria-label="Papel" className="flex">
          {(['letter', 'a4'] as PaperId[]).map((p) => (
            <Segment key={p} selected={project.paper === p} onClick={() => dispatch({ type: 'setPaper', paper: p })}>
              {PAPER[p].label}
            </Segment>
          ))}
        </div>
      </Dock>

      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])], true)
          e.target.value = ''
        }}
      />

      {proof && (
        <Proof
          project={project}
          photos={photos}
          thumbs={thumbs}
          lowDpi={lowDpi}
          emptySlots={emptySlots}
          onClose={() => setProof(false)}
          onPrint={(b, c) => dispatch({ type: 'setPrint', bleed: b, cropMarks: c })}
          onError={(m) => toasts.add({ title: 'No se pudo exportar', description: m, variant: 'error' })}
          onDone={(name) => toasts.add({ title: 'PDF listo', description: name, variant: 'success' })}
        />
      )}

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

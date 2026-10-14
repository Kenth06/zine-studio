import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { DropdownMenu } from '@cloudflare/kumo/components/dropdown'
import { useKumoToastManager } from '@cloudflare/kumo/components/toast'
import { Tooltip } from '@cloudflare/kumo/components/tooltip'
import { cn } from '@cloudflare/kumo/utils'
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  FilePlusIcon,
  ImagesIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { cropRect, dpiLevel, effectiveDpi } from '../lib/crop'
import { FORMATS, summary } from '../lib/formats'
import { padToMultiple, readingSpreads } from '../lib/imposition'
import { bleedFor, pageName, type PhotoMeta, type Project } from '../lib/model'
import { slotsFor } from '../lib/templates'
import type { Action } from '../state/project'
import { useViewport } from '../state/viewport'
import { Bar, CtaButton, Divider, Dock, DockButton, FloatButton, IconButton } from './Chrome'
import { PageTools } from './PageTools'
import { useDrag, type DragPayload, type DropTarget } from './drag'
import { PageView } from './PageView'
import { Proof } from './Proof'
import { Slug } from './Slug'

interface Props {
  project: Project
  dispatch: Dispatch<Action>
  thumbs: Record<string, string>
  importing: number
  canUndo: boolean
  canRedo: boolean
  onFiles: (files: File[], fill: boolean) => Promise<PhotoMeta[]>
  onNew: () => void
  onWipe: () => Promise<void>
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export function Editor({ project, dispatch, thumbs, importing, canUndo, canRedo, onFiles, onNew, onWipe }: Props) {
  const toasts = useKumoToastManager()
  const vp = useViewport()
  const [sel, setSel] = useState<{ page: number; slot: number | null }>({ page: 0, slot: null })
  const [proof, setProof] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const exportButton = useRef<HTMLButtonElement>(null)
  const toolsSlot = useRef<HTMLDivElement>(null)
  // Slot that the file picker is choosing for, if it was opened from a slot.
  const pickFor = useRef<{ page: number; slot: number } | null>(null)
  const strip = useRef<HTMLUListElement>(null)

  // A mouse wheel only scrolls vertically; turn it sideways over the photo strip.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [project.photos.length])

  const format = FORMATS[project.format]
  const size = format.pageSize(project.paper)
  const bleed = bleedFor(project)
  const total = project.pages.length
  const page = Math.min(sel.page, total - 1)
  const photos = useMemo(() => new Map(project.photos.map((p) => [p.id, p])), [project.photos])
  const pxPerMm = Math.min(Math.min(vp.h * 0.6, 520) / size.h, (vp.w - 32) / (2 * size.w))

  // Effective DPI of every placed photo: drives warnings in the dock and the proof.
  const { dpiBySlot, worstDpi, lowDpi, emptySlots, emptyTexts } = useMemo(() => {
    const bySlot = new Map<string, number>()
    const worst = new Map<string, number>()
    let empty = 0
    let texts = 0
    project.pages.forEach((pg, pi) => {
      const slots = slotsFor(pg.template, size, bleed)
      if (slots.some((s) => s.kind === 'text') && !pg.text.trim()) texts++
      slots
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
    return { dpiBySlot: bySlot, worstDpi: worst, lowDpi: low, emptySlots: empty, emptyTexts: texts }
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

  // Undo / redo. Text fields keep their own native undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || isTyping(e.target) || proof) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) dispatch({ type: 'undo' })
      else if ((k === 'z' && e.shiftKey) || k === 'y') dispatch({ type: 'redo' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, proof])

  // Escape steps out: first out of a text field, then out of the selected photo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || proof || e.defaultPrevented) return
      if (isTyping(e.target)) (e.target as HTMLElement).blur()
      else setSel((s) => (s.slot === null ? s : { ...s, slot: null }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [proof])

  // Keep the selected spread's tools visible above the dock.
  useEffect(() => {
    toolsSlot.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [page, sel.slot])

  const undoable = (title: string) =>
    toasts.add({ title, actions: [{ children: 'Deshacer', onClick: () => dispatch({ type: 'undo' }) }] })

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

  // Drag photos between slots (swap), from the dock into a slot, or a page number onto another page (reorder).
  const accepts = (p: DragPayload, t: DropTarget) =>
    p.kind === 'photo'
      ? t.kind === 'slot' && !(p.from && p.from.page === t.ref.page && p.from.slot === t.ref.slot)
      : t.kind === 'page' && t.index !== p.index
  const drag = useDrag(accepts, (p, t) => {
    if (p.kind === 'photo' && t.kind === 'slot') {
      if (p.from) dispatch({ type: 'swap', a: p.from, b: t.ref })
      else dispatch({ type: 'assign', page: t.ref.page, slot: t.ref.slot, photoId: p.photoId })
      setSel({ page: t.ref.page, slot: t.ref.slot })
    } else if (p.kind === 'page' && t.kind === 'page') {
      dispatch({ type: 'movePage', from: p.index, to: t.index })
      setSel({ page: t.index, slot: null })
    }
  })
  const photoGhost = (id: string) => thumbs[id] && <img src={thumbs[id]} alt="" className="size-14 rounded-md object-cover" />

  /** First file goes into the slot; any others fill empty slots as usual. */
  const filesToSlot = async (pageIndex: number, slot: number, files: File[]) => {
    const added = await onFiles(files, false)
    if (!added.length) return
    dispatch({ type: 'assign', page: pageIndex, slot, photoId: added[0].id })
    if (added.length > 1) dispatch({ type: 'autoFill', ids: added.slice(1).map((m) => m.id) })
    setSel({ page: pageIndex, slot })
  }

  const openPicker = (target: { page: number; slot: number } | null) => {
    pickFor.current = target
    input.current?.click()
  }

  const deselect = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSel((s) => ({ ...s, slot: null }))
  }

  return (
    <div className="mat min-h-full" onClick={deselect}>
      <h1 className="sr-only">Zine Studio · {summary(project.format, project.paper, total)}</h1>

      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-30 flex items-center gap-2 sm:left-5">
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
        <FloatButton aria-label="Deshacer" title={canUndo ? 'Deshacer (Ctrl+Z)' : 'Nada que deshacer'} disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
          <ArrowArcLeftIcon size={16} />
        </FloatButton>
        <FloatButton aria-label="Rehacer" title={canRedo ? 'Rehacer (Ctrl+Shift+Z)' : 'Nada que rehacer'} disabled={!canRedo} onClick={() => dispatch({ type: 'redo' })}>
          <ArrowArcRightIcon size={16} />
        </FloatButton>
      </div>

      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-30 sm:right-5">
        <CtaButton ref={exportButton} onClick={() => setProof(true)}>
          <DownloadSimpleIcon size={16} weight="bold" />
          Exportar
        </CtaButton>
      </div>

      <main className="flex flex-col items-center gap-6 px-4 pt-24 pb-40" onClick={deselect}>
        {readingSpreads(total).map((spread) => {
          const active = spread.includes(page + 1)
          return (
            <figure key={spread.join('-')} className="flex max-w-full flex-col items-center gap-3" onClick={deselect}>
              <div className="flex gap-0.5">
                {spread.map((n) => (
                  <div key={project.pages[n - 1].id} data-drop-page={n - 1} className="flex flex-col items-center gap-2 rounded-[3px]">
                    <PageView
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
                      onFill={(slot, f) => dispatch({ type: 'updateFill', page: n - 1, slot, fill: f })}
                      onClear={(slot) => {
                        dispatch({ type: 'clearSlot', page: n - 1, slot })
                        undoable('Foto quitada del hueco')
                      }}
                      onText={(text) => dispatch({ type: 'setText', page: n - 1, text })}
                      onFilesToSlot={(slot, files) => void filesToSlot(n - 1, slot, files)}
                      onPickForSlot={(slot) => openPicker({ page: n - 1, slot })}
                      onDragPhoto={(e, slot) => {
                        const f = project.pages[n - 1].fills[slot]
                        if (f) drag.start(e, { kind: 'photo', photoId: f.photoId, from: { page: n - 1, slot } }, photoGhost(f.photoId))
                      }}
                    />
                  </div>
                ))}
              </div>
              <figcaption className="flex gap-2">
                {spread.map((n) => (
                  <Slug key={n} className={n === page + 1 ? 'text-kumo-default' : ''}>
                    {n === 1 ? 'Portada' : n === total ? 'Contraportada' : String(n).padStart(2, '0')}
                  </Slug>
                ))}
              </figcaption>
              {/* Reserved under every spread so selecting another page never shifts the layout. */}
              <div ref={active ? toolsSlot : undefined} className="flex h-16 w-full max-w-full min-w-0 scroll-mb-28 items-start justify-center">
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
                      undoable(`${pageName(page, total)} eliminada`)
                    }}
                    onFill={(slot, f) => dispatch({ type: 'updateFill', page, slot, fill: f })}
                    onClear={(slot) => {
                      dispatch({ type: 'clearSlot', page, slot })
                      setSel({ page, slot: null })
                      undoable('Foto quitada del hueco')
                    }}
                    onPageTools={() => setSel({ page, slot: null })}
                  />
                )}
              </div>
            </figure>
          )
        })}
      </main>

      {missing > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+68px)] z-30 flex justify-center">
          <Bar label="Pliego incompleto" className="pl-3">
            <span className="text-[12px] whitespace-nowrap text-kumo-default">
              Faltan {missing} {missing === 1 ? 'página' : 'páginas'} para el pliego
            </span>
            <DockButton onClick={() => dispatch({ type: 'addPage', after: total - 2, count: missing })} className="h-7">
              Añadir {missing}
            </DockButton>
          </Bar>
        </div>
      )}

      <Dock label="Fotos">
        {project.photos.length === 0 ? (
          <DockButton onClick={() => openPicker(null)}>
            <ImagesIcon size={16} />
            Elegir fotos
          </DockButton>
        ) : (
          <ul ref={strip} className="no-scrollbar flex max-w-[min(70vw,640px)] gap-1.5 overflow-x-auto p-1" aria-label="Fotos del zine">
            {project.photos.map((photo) => {
              const dpi = worstDpi.get(photo.id)
              const level = dpi === undefined ? null : dpiLevel(dpi)
              const placed = fill?.photoId === photo.id
              return (
                <li key={photo.id} className="relative shrink-0">
                  <Tooltip
                    content={photo.name + (dpi === undefined ? ' · sin usar' : ' · ' + dpi + ' ppp')}
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => drag.start(e, { kind: 'photo', photoId: photo.id }, photoGhost(photo.id))}
                        onClick={() => pick(photo.id)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Delete' && e.key !== 'Backspace') return
                          dispatch({ type: 'removePhoto', id: photo.id })
                          undoable(`${photo.name} quitada del zine`)
                        }}
                        aria-label={`${photo.name}${dpi === undefined ? ', sin usar' : ''}. Supr para quitarla.`}
                        style={{ touchAction: 'pan-x' }}
                        className={cn(
                          'focus-ring block size-10 cursor-grab rounded-[8px] bg-kumo-recessed',
                          'transition-[box-shadow,opacity,scale] duration-(--dur-quick) ease-out active:scale-[0.96]',
                          placed
                            ? 'ring-2 ring-kumo-contrast ring-offset-1 ring-offset-(--float-bg)'
                            : 'hover:ring-2 hover:ring-kumo-interact hover:ring-offset-1 hover:ring-offset-(--float-bg)',
                          dpi === undefined && 'opacity-55 hover:opacity-100',
                        )}
                      >
                        {thumbs[photo.id] && (
                          <img src={thumbs[photo.id]} alt="" draggable={false} className="photo-outline size-full rounded-[8px] object-cover" />
                        )}
                      </button>
                    }
                  />
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
        <Divider />
        <IconButton aria-label="Añadir fotos" title="Añadir fotos" onClick={() => openPicker(null)}>
          <PlusIcon size={16} />
        </IconButton>
        {importing > 0 && <Slug className="px-1 whitespace-nowrap">Leyendo {importing}…</Slug>}
      </Dock>

      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          const target = pickFor.current
          pickFor.current = null
          if (target) void filesToSlot(target.page, target.slot, files)
          else void onFiles(files, true)
          e.target.value = ''
        }}
      />

      {drag.ghost}

      {proof && (
        <Proof
          project={project}
          photos={photos}
          thumbs={thumbs}
          lowDpi={lowDpi}
          emptySlots={emptySlots}
          emptyTexts={emptyTexts}
          onClose={() => {
            setProof(false)
            requestAnimationFrame(() => exportButton.current?.focus())
          }}
          onPaper={(paper) => dispatch({ type: 'setPaper', paper })}
          onFormat={(next) => {
            const fixed = FORMATS[next].fixedPages
            dispatch({ type: 'setFormat', format: next })
            if (fixed && total > fixed) undoable(`Se quitaron ${total - fixed} páginas: un mini-zine tiene ${fixed}`)
          }}
          onPrint={(b, c) => dispatch({ type: 'setPrint', bleed: b, cropMarks: c })}
          onError={(m) => toasts.add({ title: 'No se pudo exportar', description: m, variant: 'error' })}
          onDone={(name) => toasts.add({ title: 'PDF listo', description: name, variant: 'success' })}
        />
      )}

      <Dialog.Root role="alertdialog" open={confirmWipe} onOpenChange={setConfirmWipe}>
        <Dialog size="sm" className="flex flex-col gap-4 p-6">
          <Dialog.Title className="text-base font-semibold">¿Borrar todo?</Dialog.Title>
          <Dialog.Description className="text-sm text-pretty text-kumo-subtle">
            Se borran el borrador y todas las fotos guardadas en este navegador. Los PDFs que ya descargaste no se tocan.
          </Dialog.Description>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="destructive"
              onClick={async () => {
                await onWipe()
                setConfirmWipe(false)
              }}
            >
              Borrar todo
            </Button>
            <Button variant="secondary" autoFocus onClick={() => setConfirmWipe(false)}>
              Cancelar
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </div>
  )
}


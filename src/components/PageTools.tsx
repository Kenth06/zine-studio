import { Tooltip } from '@cloudflare/kumo/components/tooltip'
import { cn } from '@cloudflare/kumo/utils'
import { ArrowLeftIcon, ArrowRightIcon, CrosshairIcon, ImageBrokenIcon, PlusIcon, SquaresFourIcon, TrashIcon } from '@phosphor-icons/react'
import { useRef, type KeyboardEvent } from 'react'
import { dpiLevel, MAX_ZOOM, type PhotoFill } from '../lib/crop'
import { pageName, withTemplate, type Page, type PhotoMeta } from '../lib/model'
import { TEMPLATES, type TemplateId } from '../lib/templates'
import { Bar, Divider, DockButton, FieldSlider, IconButton } from './Chrome'
import { StaticPage } from './PageView'

interface Props {
  page: Page
  index: number
  total: number
  size: { w: number; h: number }
  fixedPages: boolean
  photos: Map<string, PhotoMeta>
  thumbs: Record<string, string>
  photo?: { meta: PhotoMeta; fill: PhotoFill; dpi: number; slot: number }
  onTemplate: (t: TemplateId) => void
  onMove: (to: number) => void
  onAdd: () => void
  onRemove: () => void
  onFill: (slot: number, fill: PhotoFill) => void
  onClear: (slot: number) => void
  onPageTools: () => void
}

const PREVIEW_H = 44
const QUALITY = { ok: 'nítida', warn: 'algo suave', bad: 'pixelada' } as const

/** One bar under the selected spread: photo tools while a photo is chosen, page tools otherwise. */
export function PageTools(p: Props) {
  if (p.photo) return <PhotoBar {...p} photo={p.photo} />
  return <PageBar {...p} />
}

function PhotoBar(p: Props & { photo: NonNullable<Props['photo']> }) {
  const { photo } = p
  const level = dpiLevel(photo.dpi)
  return (
    <Bar label="Foto" className="w-[min(460px,100%)]">
      <FieldSlider
        label="Zoom"
        value={photo.fill.zoom}
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        format={(v) => `${Math.round(v * 100)} %`}
        onChange={(zoom) => p.onFill(photo.slot, { ...photo.fill, zoom })}
        className="min-w-28 flex-1"
      />
      <span
        title="Puntos por pulgada al imprimir este hueco. 300 es ideal; menos de 150 se ve pixelado."
        className={cn(
          'shrink-0 px-2 text-[12px] whitespace-nowrap tabular-nums',
          level === 'bad' ? 'text-kumo-danger' : level === 'warn' ? 'text-kumo-warning' : 'text-kumo-subtle',
        )}
      >
        {photo.dpi} ppp<span className="hidden sm:inline"> · {QUALITY[level]}</span>
      </span>
      <IconButton aria-label="Centrar foto" title="Centrar" onClick={() => p.onFill(photo.slot, { ...photo.fill, zoom: 1, fx: 0.5, fy: 0.5 })}>
        <CrosshairIcon size={16} />
      </IconButton>
      <IconButton aria-label="Quitar la foto de este hueco" title="Quitar foto" onClick={() => p.onClear(photo.slot)}>
        <ImageBrokenIcon size={16} />
      </IconButton>
      <Divider />
      <DockButton onClick={p.onPageTools} aria-label="Herramientas de página" className="px-2.5 text-kumo-subtle">
        <SquaresFourIcon size={16} />
        <span className="hidden sm:inline">Página</span>
      </DockButton>
    </Bar>
  )
}

function PageBar(p: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const px = PREVIEW_H / p.size.h
  const current = Math.max(0, TEMPLATES.findIndex((t) => t.id === p.page.template))

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const to = (current + step + TEMPLATES.length) % TEMPLATES.length
    p.onTemplate(TEMPLATES[to].id)
    refs.current[to]?.focus()
  }

  return (
    <Bar label={pageName(p.index, p.total)} className="p-1.5">
      <div role="radiogroup" aria-label="Plantilla" className="flex gap-1.5 p-0.5" onKeyDown={onKeyDown}>
        {TEMPLATES.map((t, i) => {
          const on = i === current
          return (
            <Tooltip
              key={t.id}
              content={t.label}
              render={
                <button
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t.label}
                  tabIndex={on ? 0 : -1}
                  onClick={() => p.onTemplate(t.id)}
                  className={cn(
                    'focus-ring shrink-0 overflow-hidden rounded-[3px] bg-(--paper-sheet) transition-shadow duration-(--dur-quick)',
                    on ? 'ring-2 ring-kumo-contrast ring-offset-2 ring-offset-(--float-bg)' : 'ring-1 ring-kumo-line hover:ring-kumo-interact',
                  )}
                  style={{ width: p.size.w * px, height: PREVIEW_H }}
                >
                  <StaticPage page={withTemplate(p.page, t.id)} size={p.size} pxPerMm={px} photos={p.photos} thumbs={p.thumbs} ghost />
                </button>
              }
            />
          )
        })}
      </div>
      <Divider />
      <IconButton aria-label="Mover página antes" title="Mover antes" disabled={p.index === 0} onClick={() => p.onMove(p.index - 1)}>
        <ArrowLeftIcon size={16} />
      </IconButton>
      <IconButton aria-label="Mover página después" title="Mover después" disabled={p.index === p.total - 1} onClick={() => p.onMove(p.index + 1)}>
        <ArrowRightIcon size={16} />
      </IconButton>
      {!p.fixedPages && (
        <>
          <IconButton aria-label="Añadir página después" title="Añadir página" onClick={p.onAdd}>
            <PlusIcon size={16} />
          </IconButton>
          <IconButton aria-label="Eliminar página" title="Eliminar página" disabled={p.total <= 2} onClick={p.onRemove}>
            <TrashIcon size={16} />
          </IconButton>
        </>
      )}
    </Bar>
  )
}

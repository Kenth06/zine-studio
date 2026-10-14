import { cn } from '@cloudflare/kumo/utils'
import { ArrowLeftIcon, ArrowRightIcon, CrosshairIcon, PlusIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { dpiLevel, MAX_ZOOM, type PhotoFill } from '../lib/crop'
import { pageName, withTemplate, type Page, type PhotoMeta } from '../lib/model'
import { TEMPLATES, type TemplateId } from '../lib/templates'
import { Bar, Divider, FieldSlider, IconButton } from './Chrome'
import { StaticPage } from './PageView'
import { Slug } from './Slug'

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
}


const PREVIEW_H = 44

/** Tools for the selected page, floating right under its spread. */
export function PageTools(p: Props) {
  const photo = p.photo
  const level = photo && dpiLevel(photo.dpi)
  const px = PREVIEW_H / p.size.h

  return (
    <div className="flex max-w-full flex-col items-center gap-2">
      {photo && (
        <Bar label="Foto" key={`${p.page.id}-${photo.slot}`} className="w-[min(340px,calc(100vw-32px))]">
          <FieldSlider
            label="Zoom"
            value={photo.fill.zoom}
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            format={(v) => `${Math.round(v * 100)} %`}
            onChange={(zoom) => p.onFill(photo.slot, { ...photo.fill, zoom })}
            className="flex-1"
          />
          <Slug
            className={cn('w-16 shrink-0 text-center', level === 'bad' ? 'text-kumo-danger' : level === 'warn' ? 'text-kumo-warning' : '')}
          >
            {photo.dpi} ppp
          </Slug>
          <IconButton aria-label="Centrar foto" title="Centrar" onClick={() => p.onFill(photo.slot, { ...photo.fill, zoom: 1, fx: 0.5, fy: 0.5 })}>
            <CrosshairIcon size={16} />
          </IconButton>
          <IconButton aria-label="Quitar foto del hueco" title="Quitar foto" onClick={() => p.onClear(photo.slot)}>
            <XIcon size={16} />
          </IconButton>
        </Bar>
      )}

      <Bar label={pageName(p.index, p.total)} className="max-w-[calc(100vw-32px)] overflow-x-auto p-1.5">
        <div role="radiogroup" aria-label="Plantilla" className="flex gap-1.5">
          {TEMPLATES.map((t) => {
            const on = p.page.template === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t.label}
                title={t.label}
                onClick={() => p.onTemplate(t.id)}
                className={cn(
                  'shrink-0 overflow-hidden rounded-[3px] bg-(--paper-sheet) outline-none',
                  'transition-[box-shadow,opacity] duration-(--dur-quick) focus-visible:ring-2 focus-visible:ring-kumo-focus',
                  on ? 'ring-2 ring-kumo-contrast ring-offset-2 ring-offset-(--float-bg)' : 'opacity-70 ring-1 ring-kumo-hairline hover:opacity-100',
                )}
                style={{ width: p.size.w * px, height: PREVIEW_H }}
              >
                <StaticPage page={withTemplate(p.page, t.id)} size={p.size} pxPerMm={px} photos={p.photos} thumbs={p.thumbs} ghost />
              </button>
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
    </div>
  )
}

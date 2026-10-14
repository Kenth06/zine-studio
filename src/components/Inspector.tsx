import { Badge } from '@cloudflare/kumo/components/badge'
import { Button } from '@cloudflare/kumo/components/button'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { cn } from '@cloudflare/kumo/utils'
import { ArrowLeftIcon, ArrowRightIcon, CrosshairIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { cropRect, dpiLevel, effectiveDpi, MAX_ZOOM, type PhotoFill } from '../lib/crop'
import type { Page, PhotoMeta } from '../lib/model'
import { slotsFor, TEMPLATES, type TemplateId } from '../lib/templates'
import { TemplateIcon } from './Diagrams'
import { Slug } from './Slug'

interface Props {
  page: Page
  index: number
  total: number
  size: { w: number; h: number }
  bleed: number
  fixedPages: boolean
  slot: number | null
  photos: Map<string, PhotoMeta>
  thumbs: Record<string, string>
  onTemplate: (t: TemplateId) => void
  onMove: (to: number) => void
  onAdd: () => void
  onRemove: () => void
  onFill: (slot: number, fill: PhotoFill) => void
  onClear: (slot: number) => void
  onText: (text: string) => void
}

const pageName = (i: number, total: number) => (i === 0 ? 'Portada' : i === total - 1 ? 'Contraportada' : `Página ${i + 1}`)

export function Inspector(p: Props) {
  const photoSlots = slotsFor(p.page.template, p.size, p.bleed).filter((s) => s.kind === 'photo')
  const hasText = slotsFor(p.page.template, p.size).some((s) => s.kind === 'text')
  const fill = p.slot !== null ? p.page.fills[p.slot] : null
  const meta = fill ? p.photos.get(fill.photoId) : undefined
  const slotRect = p.slot !== null ? photoSlots[p.slot] : undefined

  return (
    <div className="flex flex-col gap-3">
      <LayerCard>
        <LayerCard.Secondary className="flex items-center justify-between">
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{pageName(p.index, p.total)}</span>
            <Slug>
              {p.index + 1} / {p.total}
            </Slug>
          </span>
          <span className="flex gap-0.5">
            <Button variant="ghost" size="sm" shape="square" icon={ArrowLeftIcon} aria-label="Mover página antes" disabled={p.index === 0} onClick={() => p.onMove(p.index - 1)} />
            <Button variant="ghost" size="sm" shape="square" icon={ArrowRightIcon} aria-label="Mover página después" disabled={p.index === p.total - 1} onClick={() => p.onMove(p.index + 1)} />
            {!p.fixedPages && (
              <>
                <Button variant="ghost" size="sm" shape="square" icon={PlusIcon} aria-label="Añadir página después" onClick={p.onAdd} />
                <Button variant="ghost" size="sm" shape="square" icon={TrashIcon} aria-label="Eliminar página" disabled={p.total <= 2} onClick={p.onRemove} />
              </>
            )}
          </span>
        </LayerCard.Secondary>
        <LayerCard.Primary>
          <div role="radiogroup" aria-label="Plantilla" className="grid grid-cols-4 gap-1 rounded-lg bg-kumo-recessed p-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={p.page.template === t.id}
                aria-label={t.label}
                title={t.label}
                onClick={() => p.onTemplate(t.id)}
                className={cn(
                  'flex items-center justify-center rounded-md py-1.5 transition-colors duration-(--dur-quick)',
                  p.page.template === t.id ? 'bg-kumo-base text-kumo-default shadow-xs ring-1 ring-kumo-hairline' : 'text-kumo-subtle hover:text-kumo-default',
                )}
              >
                <TemplateIcon template={t.id} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-kumo-subtle">{TEMPLATES.find((t) => t.id === p.page.template)?.label}</p>
        </LayerCard.Primary>
      </LayerCard>

      {meta && fill && slotRect && p.slot !== null && (
        <PhotoControls
          meta={meta}
          fill={fill}
          thumb={p.thumbs[meta.id]}
          dpi={effectiveDpi(cropRect(meta.w, meta.h, slotRect.w / slotRect.h, fill), slotRect.w)}
          onFill={(f) => p.onFill(p.slot!, f)}
          onClear={() => p.onClear(p.slot!)}
        />
      )}
      {p.slot !== null && !fill && (
        <p className="px-1 text-xs leading-snug text-kumo-subtle">Hueco vacío. Toca una foto de la bandeja para ponerla aquí.</p>
      )}

      {hasText && (
        <LayerCard>
          <LayerCard.Secondary>
            <span className="text-sm font-medium">Texto</span>
          </LayerCard.Secondary>
          <LayerCard.Primary>
            <textarea
              value={p.page.text}
              onChange={(e) => p.onText(e.target.value)}
              rows={4}
              placeholder="Un título, una fecha, un pie de foto…"
              aria-label="Texto de la página"
              className="w-full resize-y rounded-md bg-kumo-control px-2.5 py-2 font-serif text-[15px] leading-snug text-kumo-default ring-1 ring-kumo-line outline-none placeholder:text-kumo-placeholder focus:ring-2 focus:ring-kumo-focus"
            />
          </LayerCard.Primary>
        </LayerCard>
      )}
    </div>
  )
}

function PhotoControls(p: {
  meta: PhotoMeta
  fill: PhotoFill
  thumb?: string
  dpi: number
  onFill: (f: PhotoFill) => void
  onClear: () => void
}) {
  const level = dpiLevel(p.dpi)
  return (
    <LayerCard>
      <LayerCard.Secondary className="flex items-center justify-between">
        <span className="truncate text-sm font-medium" title={p.meta.name}>
          {p.meta.name}
        </span>
        <Button variant="ghost" size="sm" shape="square" icon={TrashIcon} aria-label="Quitar foto del hueco" onClick={p.onClear} />
      </LayerCard.Secondary>
      <LayerCard.Primary className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Slug>
            {p.meta.w} × {p.meta.h} px
          </Slug>
          <Badge variant={level === 'bad' ? 'error' : level === 'warn' ? 'warning' : 'secondary'} className="tabular-nums">
            {p.dpi} ppp
          </Badge>
        </div>
        {level !== 'ok' && (
          <p className="text-xs leading-snug text-kumo-subtle">
            {level === 'bad' ? 'Se verá pixelada al imprimir.' : 'Puede verse algo suave al imprimir.'} Usa un hueco más pequeño o menos zoom.
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-xs text-kumo-subtle">
            <span>Zoom</span>
            <span className="tabular-nums">{Math.round(p.fill.zoom * 100)} %</span>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={p.fill.zoom}
            onChange={(e) => p.onFill({ ...p.fill, zoom: Number(e.target.value) })}
            className="w-full accent-(--text-color-kumo-default)"
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs leading-snug text-kumo-subtle">Arrastra la foto o usa las flechas para encuadrar.</p>
          <Button variant="secondary" size="sm" icon={CrosshairIcon} onClick={() => p.onFill({ ...p.fill, zoom: 1, fx: 0.5, fy: 0.5 })}>
            Centrar
          </Button>
        </div>
      </LayerCard.Primary>
    </LayerCard>
  )
}

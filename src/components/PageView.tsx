import { cn } from '@cloudflare/kumo/utils'
import { ImageIcon } from '@phosphor-icons/react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cropRect, panFill, type PhotoFill } from '../lib/crop'
import { marginFor } from '../lib/formats'
import type { Page, PhotoMeta } from '../lib/model'
import { slotsFor, textSizePt } from '../lib/templates'

export const PHOTO_MIME = 'application/x-zine-photo'

interface Props {
  page: Page
  number: number
  size: { w: number; h: number }
  bleed: number
  pxPerMm: number
  photos: Map<string, PhotoMeta>
  thumbs: Record<string, string>
  selected: boolean
  selectedSlot: number | null
  onSelect: (slot: number | null) => void
  onAssign: (slot: number, photoId: string) => void
  onFill: (slot: number, fill: PhotoFill) => void
  onClear: (slot: number) => void
  onText: (text: string) => void
  /** Files dropped on a slot, or chosen for it from the picker. */
  onFilesToSlot: (slot: number, files: File[]) => void
  onPickForSlot: (slot: number) => void
}

export function PageView(props: Props) {
  const { page, size, bleed, pxPerMm, selected } = props
  const slots = slotsFor(page.template, size, bleed)
  const m = marginFor(size)
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  let photoIdx = 0

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-(--paper-sheet) text-(--paper-ink) shadow-(--paper-shadow) rounded-(--paper-radius)',
        'transition-[outline-color] duration-(--dur-quick) outline-2 outline-offset-4',
        selected ? 'outline-kumo-contrast' : 'outline-transparent',
      )}
      style={{ width: size.w * pxPerMm, height: size.h * pxPerMm }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onSelect(null)
      }}
    >
      {slots.map((slot, i) => {
        const style = {
          left: pct(slot.x, size.w),
          top: pct(slot.y, size.h),
          width: pct(slot.w, size.w),
          height: pct(slot.h, size.h),
        }
        if (slot.kind === 'text') {
          const fs = ((textSizePt(size) * 25.4) / 72) * pxPerMm
          return (
            <textarea
              key={i}
              value={page.text}
              onChange={(e) => props.onText(e.target.value)}
              onFocus={() => props.onSelect(null)}
              placeholder="Escribe aquí"
              aria-label={`Texto de la página ${props.number}`}
              className="absolute resize-none overflow-hidden bg-transparent font-serif text-(--paper-ink) outline-hidden placeholder:text-(--paper-placeholder) focus:bg-(--paper-empty) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              style={{ ...style, fontSize: fs, lineHeight: 1.35 }}
            />
          )
        }
        const si = photoIdx++
        return (
          <PhotoSlot
            key={i}
            {...props}
            index={si}
            style={style}
            fill={page.fills[si] ?? null}
            aspect={slot.w / slot.h}
            slotPxW={slot.w * pxPerMm}
          />
        )
      })}
      {selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute border border-dashed border-(--paper-guide)"
          style={{ inset: m * pxPerMm }}
        />
      )}
    </div>
  )
}

function PhotoSlot(
  props: Props & {
    index: number
    style: React.CSSProperties
    fill: PhotoFill | null
    aspect: number
    slotPxW: number
  },
) {
  const { index, fill, aspect, selected, selectedSlot } = props
  const meta = fill ? props.photos.get(fill.photoId) : undefined
  const url = fill ? props.thumbs[fill.photoId] : undefined
  const active = selected && selectedSlot === index
  const drag = useRef<{ x: number; y: number; fill: PhotoFill } | null>(null)
  const [over, setOver] = useState(false)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // A second click on an empty, already selected slot asks for a photo for it.
    if (!fill && active) {
      props.onPickForSlot(index)
      return
    }
    props.onSelect(index)
    if (!fill || !meta) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Synthetic or already-released pointers cannot be captured; dragging still works without it.
    }
    drag.current = { x: e.clientX, y: e.clientY, fill }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || !meta) return
    props.onFill(index, panFill(d.fill, meta.w, meta.h, aspect, e.clientX - d.x, e.clientY - d.y, props.slotPxW))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!fill && active) props.onPickForSlot(index)
      else props.onSelect(index)
      return
    }
    if (!fill || !meta) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      props.onClear(index)
      return
    }
    const step = e.shiftKey ? 40 : 8
    const delta = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
    if (delta) {
      e.preventDefault()
      props.onFill(index, panFill(fill, meta.w, meta.h, aspect, delta[0], delta[1], props.slotPxW))
    }
  }

  let img: React.CSSProperties | undefined
  if (fill && meta) {
    const c = cropRect(meta.w, meta.h, aspect, fill)
    img = {
      width: `${(meta.w / c.w) * 100}%`,
      height: `${(meta.h / c.h) * 100}%`,
      left: `${(-c.x / c.w) * 100}%`,
      top: `${(-c.y / c.h) * 100}%`,
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={meta ? `Hueco ${index + 1}: ${meta.name}` : `Hueco ${index + 1} vacío${active ? ', Intro para elegir una foto' : ''}`}
      aria-pressed={active}
      className={cn(
        'absolute overflow-hidden outline-hidden select-none',
        fill ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer bg-(--paper-empty)',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)',
      )}
      style={props.style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        const types = e.dataTransfer.types
        if (types.includes(PHOTO_MIME) || types.includes('Files')) {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const id = e.dataTransfer.getData(PHOTO_MIME)
        const files = [...e.dataTransfer.files]
        if (!id && !files.length) return
        e.preventDefault()
        e.stopPropagation()
        if (id) props.onAssign(index, id)
        else props.onFilesToSlot(index, files)
        props.onSelect(index)
      }}
    >
      {url && img ? (
        <img src={url} alt="" draggable={false} className="absolute max-w-none" style={img} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 border border-dashed border-(--paper-guide) text-(--paper-guide)">
          <ImageIcon size={18} />
          {active && <span className="text-[11px] font-medium text-(--paper-placeholder)">Elegir foto</span>}
        </div>
      )}
      {over && <span aria-hidden className="pointer-events-none absolute inset-0 bg-kumo-contrast/10 shadow-[inset_0_0_0_2px_var(--color-kumo-contrast)]" />}
      {active && (
        // Above the photo so it always shows: ink ring with a white inner edge for dark photos.
        <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--color-kumo-contrast),inset_0_0_0_3px_rgb(255_255_255/0.9)]" />
      )}
    </div>
  )
}

/** Non-interactive page, for the print proof. Same geometry as the editor. */
export function StaticPage({
  page,
  size,
  pxPerMm,
  photos,
  thumbs,
  ghost = false,
}: Pick<Props, 'page' | 'size' | 'pxPerMm' | 'photos' | 'thumbs'> & {
  /** Show empty slots and text as grey shapes, for template thumbnails. */
  ghost?: boolean
}) {
  let photoIdx = 0
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  return (
    <div className="relative size-full overflow-hidden">
      {slotsFor(page.template, size, 0).map((slot, i) => {
        const style = { left: pct(slot.x, size.w), top: pct(slot.y, size.h), width: pct(slot.w, size.w), height: pct(slot.h, size.h) }
        if (slot.kind === 'text') {
          const fs = ((textSizePt(size) * 25.4) / 72) * pxPerMm
          if (ghost)
            return (
              <div
                key={i}
                className="absolute"
                style={{ ...style, backgroundImage: 'repeating-linear-gradient(var(--paper-guide) 0 1.5px, transparent 1.5px 5px)', opacity: 0.6 }}
              />
            )
          return (
            <div key={i} className="absolute overflow-hidden font-serif whitespace-pre-wrap" style={{ ...style, fontSize: fs, lineHeight: 1.35 }}>
              {page.text}
            </div>
          )
        }
        const fill = page.fills[photoIdx++]
        const meta = fill && photos.get(fill.photoId)
        const url = fill && thumbs[fill.photoId]
        if (!fill || !meta || !url) return ghost ? <div key={i} className="absolute bg-(--paper-guide) opacity-40" style={style} /> : null
        const c = cropRect(meta.w, meta.h, slot.w / slot.h, fill)
        return (
          <div key={i} className="absolute overflow-hidden" style={style}>
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{
                width: `${(meta.w / c.w) * 100}%`,
                height: `${(meta.h / c.h) * 100}%`,
                left: `${(-c.x / c.w) * 100}%`,
                top: `${(-c.y / c.h) * 100}%`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

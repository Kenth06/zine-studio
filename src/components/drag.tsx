import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { SlotRef } from '../lib/model'

/**
 * Pointer-based drag and drop, so it works the same with a mouse, a pen or a finger.
 * A press only becomes a drag after it moves a few pixels; otherwise it stays a click.
 * Drop targets are plain elements carrying `data-drop-slot="page:slot"` or `data-drop-page="index"`.
 */

export type DragPayload = { kind: 'photo'; photoId: string; from?: SlotRef } | { kind: 'page'; index: number }

export type DropTarget = { kind: 'slot'; ref: SlotRef } | { kind: 'page'; index: number }

const THRESHOLD = 6
const EDGE = 96
const OVER = 'data-drop-over'

function targetAt(x: number, y: number, payload: DragPayload): { el: Element; target: DropTarget } | null {
  const el = document.elementFromPoint(x, y)?.closest(payload.kind === 'page' ? '[data-drop-page]' : '[data-drop-slot]')
  if (!el) return null
  const slot = el.getAttribute('data-drop-slot')
  if (slot) {
    const [page, s] = slot.split(':').map(Number)
    return { el, target: { kind: 'slot', ref: { page, slot: s } } }
  }
  return { el, target: { kind: 'page', index: Number(el.getAttribute('data-drop-page')) } }
}

interface Active {
  payload: DragPayload
  preview: ReactNode
  x: number
  y: number
}

export function useDrag(accepts: (p: DragPayload, t: DropTarget) => boolean, onDrop: (p: DragPayload, t: DropTarget) => void) {
  const [active, setActive] = useState<Active | null>(null)
  const pending = useRef<{ payload: DragPayload; preview: ReactNode; x: number; y: number; id: number } | null>(null)
  const over = useRef<Element | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const handlers = useRef({ accepts, onDrop })
  useEffect(() => {
    handlers.current = { accepts, onDrop }
  })

  const setOver = (el: Element | null) => {
    if (over.current === el) return
    over.current?.removeAttribute(OVER)
    el?.setAttribute(OVER, '')
    over.current = el
  }

  const end = useCallback(() => {
    pending.current = null
    setOver(null)
    setActive(null)
    document.documentElement.removeAttribute('data-dragging')
  }, [])

  useEffect(() => {
    let frame = 0
    // Scroll the page while the pointer sits near the top or bottom edge.
    const scrollLoop = () => {
      const { y } = pointer.current
      const dy = y < EDGE ? -(EDGE - y) / 6 : y > innerHeight - EDGE ? (y - (innerHeight - EDGE)) / 6 : 0
      if (dy) scrollBy(0, dy)
      frame = requestAnimationFrame(scrollLoop)
    }

    const onMove = (e: PointerEvent) => {
      const p = pending.current
      if (!p || e.pointerId !== p.id) return
      pointer.current = { x: e.clientX, y: e.clientY }
      if (!document.documentElement.hasAttribute('data-dragging')) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < THRESHOLD) return
        document.documentElement.setAttribute('data-dragging', '')
        frame = requestAnimationFrame(scrollLoop)
      }
      e.preventDefault()
      const hit = targetAt(e.clientX, e.clientY, p.payload)
      setOver(hit && handlers.current.accepts(p.payload, hit.target) ? hit.el : null)
      setActive({ payload: p.payload, preview: p.preview, x: e.clientX, y: e.clientY })
    }
    const onUp = (e: PointerEvent) => {
      const p = pending.current
      if (!p || e.pointerId !== p.id) return
      const dragging = document.documentElement.hasAttribute('data-dragging')
      if (dragging) {
        const hit = targetAt(e.clientX, e.clientY, p.payload)
        if (hit && handlers.current.accepts(p.payload, hit.target)) handlers.current.onDrop(p.payload, hit.target)
        // Swallow the click that follows a drag so it doesn't also select something.
        addEventListener('click', (c) => c.stopPropagation(), { capture: true, once: true })
      }
      cancelAnimationFrame(frame)
      end()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pending.current) {
        e.preventDefault()
        cancelAnimationFrame(frame)
        end()
      }
    }
    addEventListener('pointermove', onMove, { passive: false })
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', end)
    addEventListener('keydown', onKey, { capture: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', end)
      removeEventListener('keydown', onKey, { capture: true })
    }
  }, [end])

  /** Call from a pointerdown handler. Only the primary button or a touch starts a drag. */
  const start = useCallback((e: ReactPointerEvent, payload: DragPayload, preview: ReactNode) => {
    if (e.button !== 0 || pending.current) return
    pending.current = { payload, preview, x: e.clientX, y: e.clientY, id: e.pointerId }
    pointer.current = { x: e.clientX, y: e.clientY }
  }, [])

  const ghost =
    active &&
    createPortal(
      <div aria-hidden className="pointer-events-none fixed top-0 left-0 z-50" style={{ transform: `translate(${active.x + 12}px, ${active.y + 12}px)` }}>
        <div className="animate-fade -rotate-2 rounded-[10px] bg-kumo-base p-1 shadow-(--float-shadow) ring-1 ring-(--float-ring)">{active.preview}</div>
      </div>,
      document.body,
    )

  return { start, dragging: active?.payload ?? null, ghost }
}

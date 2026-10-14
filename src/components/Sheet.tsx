import { cn } from '@cloudflare/kumo/utils'
import type { ReactNode } from 'react'
import type { FormatId } from '../lib/formats'
import type { PrintSide, SheetCell } from '../lib/imposition'

interface Props {
  format: FormatId
  size: { w: number; h: number }
  side: PrintSide
  pxPerMm: number
  /** Content for one cell, drawn upright; the sheet rotates it when needed. */
  renderCell: (cell: SheetCell) => ReactNode
  className?: string
}

const MARK = 14
const GAP = 5

/** One printed side at scale, with its fold, cut and trim marks. */
export function Sheet({ format, size, side, pxPerMm, renderCell, className }: Props) {
  const W = size.w * pxPerMm
  const H = size.h * pxPerMm
  const dash = { stroke: 'var(--paper-guide)', strokeWidth: 1, strokeDasharray: '3 3', vectorEffect: 'non-scaling-stroke' as const }
  const solid = { stroke: 'var(--paper-ink)', strokeOpacity: 0.6, strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' as const }

  return (
    <div className={cn('relative', className)} style={{ width: W + 2 * (MARK + GAP), height: H + 2 * (MARK + GAP), padding: MARK + GAP }}>
      <div
        className="relative overflow-hidden bg-(--paper-sheet) text-(--paper-ink) shadow-(--paper-shadow) rounded-(--paper-radius)"
        style={{ width: W, height: H }}
      >
        {side.cells.map((c) => (
          <div
            key={c.number}
            className={cn('absolute overflow-hidden', c.rotated && 'rotate-180')}
            style={{ left: c.x * pxPerMm, top: c.y * pxPerMm, width: c.w * pxPerMm, height: c.h * pxPerMm }}
          >
            {renderCell(c)}
          </div>
        ))}
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none" aria-hidden>
          {format === 'mini' && (
            <>
              {[1, 2, 3].map((i) => (
                <line key={i} x1={(size.w * i) / 4} y1={0} x2={(size.w * i) / 4} y2={size.h} {...dash} />
              ))}
              <line x1={0} y1={size.h / 2} x2={size.w / 4} y2={size.h / 2} {...dash} />
              <line x1={(size.w * 3) / 4} y1={size.h / 2} x2={size.w} y2={size.h / 2} {...dash} />
              <line x1={size.w / 4} y1={size.h / 2} x2={(size.w * 3) / 4} y2={size.h / 2} {...solid} />
            </>
          )}
          {format === 'booklet' && <line x1={size.w / 2} y1={0} x2={size.w / 2} y2={size.h} {...dash} />}
        </svg>
      </div>
      <CornerMarks />
    </div>
  )
}

/** Trim marks just outside the sheet's four corners. */
function CornerMarks() {
  const o = MARK + GAP
  const corners = [
    { left: 0, top: o, w: MARK, h: 0 },
    { left: o, top: 0, w: 0, h: MARK },
    { right: 0, top: o, w: MARK, h: 0 },
    { right: o, top: 0, w: 0, h: MARK },
    { left: 0, bottom: o, w: MARK, h: 0 },
    { left: o, bottom: 0, w: 0, h: MARK },
    { right: 0, bottom: o, w: MARK, h: 0 },
    { right: o, bottom: 0, w: 0, h: MARK },
  ]
  return (
    <>
      {corners.map(({ w, h, ...pos }, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute bg-(--mark)"
          style={{ ...pos, width: w || 1, height: h || 1 }}
        />
      ))}
    </>
  )
}

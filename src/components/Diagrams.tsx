import type { FormatId } from '../lib/formats'
import { slotsFor, type TemplateId } from '../lib/templates'

/** Schematic of how each format is printed and folded. Explains, never decorates. */
export function FormatDiagram({ format }: { format: FormatId }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const }
  if (format === 'mini')
    return (
      <svg viewBox="0 0 88 60" className="h-14 w-auto" aria-hidden>
        <rect x="0.5" y="0.5" width="87" height="59" {...common} />
        {[22, 44, 66].map((x) => (
          <line key={x} x1={x} y1="0.5" x2={x} y2="59.5" {...common} strokeDasharray="2 2" opacity="0.5" />
        ))}
        <line x1="0.5" y1="30" x2="87.5" y2="30" {...common} strokeDasharray="2 2" opacity="0.5" />
        <line x1="22" y1="30" x2="66" y2="30" {...common} strokeWidth={2} />
      </svg>
    )
  if (format === 'booklet')
    return (
      <svg viewBox="0 0 88 60" className="h-14 w-auto" aria-hidden>
        <rect x="6.5" y="4.5" width="78" height="53" {...common} opacity="0.4" />
        <rect x="2.5" y="2.5" width="78" height="53" {...common} className="fill-kumo-base" />
        <line x1="41.5" y1="2.5" x2="41.5" y2="55.5" {...common} strokeDasharray="2 2" opacity="0.6" />
        <line x1="41.5" y1="14" x2="41.5" y2="20" {...common} strokeWidth={2.5} />
        <line x1="41.5" y1="38" x2="41.5" y2="44" {...common} strokeWidth={2.5} />
      </svg>
    )
  return (
    <svg viewBox="0 0 88 60" className="h-14 w-auto" aria-hidden>
      <rect x="28.5" y="6.5" width="31" height="47" {...common} strokeDasharray="1.5 1.5" opacity="0.5" />
      <rect x="31.5" y="9.5" width="25" height="41" {...common} />
      {[
        [31.5, 9.5],
        [56.5, 9.5],
        [31.5, 50.5],
        [56.5, 50.5],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} opacity="0.7">
          <line x1={x} y1={y < 30 ? 1 : 59} x2={x} y2={y < 30 ? 4 : 56} {...common} />
          <line x1={x < 44 ? 20 : 68} y1={y} x2={x < 44 ? 23 : 65} y2={y} {...common} />
        </g>
      ))}
    </svg>
  )
}

export function TemplateIcon({ template }: { template: TemplateId }) {
  const page = { w: 70, h: 100 }
  return (
    <svg viewBox="0 0 70 100" className="h-9 w-auto" aria-hidden>
      <rect x="0" y="0" width="70" height="100" className="fill-kumo-base" stroke="currentColor" strokeOpacity="0.25" />
      {slotsFor(template, page).map((s, i) =>
        s.kind === 'photo' ? (
          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="currentColor" fillOpacity="0.38" />
        ) : (
          <g key={i} fill="currentColor" fillOpacity="0.5">
            {Array.from({ length: Math.min(6, Math.floor(s.h / 8)) }, (_, l) => (
              <rect key={l} x={s.x} y={s.y + 2 + l * 8} width={l % 3 === 2 ? s.w * 0.6 : s.w} height="3" />
            ))}
          </g>
        ),
      )}
    </svg>
  )
}

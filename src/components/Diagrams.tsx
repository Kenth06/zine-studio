import { slotsFor, type TemplateId } from '../lib/templates'

/** Thumbnail of a template's slots, drawn in currentColor. */
export function TemplateIcon({ template }: { template: TemplateId }) {
  const page = { w: 70, h: 100 }
  return (
    <svg viewBox="-4 -4 78 108" className="h-5 w-auto" aria-hidden>
      <rect x="0" y="0" width="70" height="100" fill="none" stroke="currentColor" strokeWidth="5" strokeOpacity="0.55" />
      {slotsFor(template, page).map((s, i) =>
        s.kind === 'photo' ? (
          <rect key={i} x={Math.max(0, s.x)} y={Math.max(0, s.y)} width={Math.min(70, s.w)} height={Math.min(100, s.h)} fill="currentColor" />
        ) : (
          <g key={i} fill="currentColor">
            {Array.from({ length: Math.min(5, Math.floor(s.h / 10)) }, (_, l) => (
              <rect key={l} x={s.x} y={s.y + 3 + l * 10} width={l % 3 === 2 ? s.w * 0.6 : s.w} height="5" />
            ))}
          </g>
        ),
      )}
    </svg>
  )
}

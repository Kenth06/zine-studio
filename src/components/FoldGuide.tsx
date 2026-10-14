import type { ReactNode } from 'react'
import { PAPER, type FormatId, type PaperId } from '../lib/formats'
import { padToMultiple } from '../lib/imposition'

/**
 * How to print and put the zine together, drawn like a hand-made instruction sheet.
 * Each step is a small SVG sketch; a turbulence filter makes the straight lines wobble
 * a little, the way a pen would. Captions are real text, so they stay readable and
 * accessible; the drawings are decoration (aria-hidden).
 */

interface Props {
  format: FormatId
  paper: PaperId
  pages: number
  bleed: number
  cropMarks: boolean
}

interface Step {
  art: ReactNode
  caption: string
}

const ink = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const paper = { ...ink, fill: 'var(--paper-sheet)' }
const fold = { ...ink, strokeWidth: 1.1, strokeDasharray: '2.5 3' }
const cut = { ...ink, strokeWidth: 2.4 }

/** Hand-lettered number at (x, y); `flip` turns it upside down like the top row of the sheet. */
function Num({ x, y, n, flip }: { x: number; y: number; n: number | string; flip?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      className="fill-current font-hand"
      transform={flip ? `rotate(180 ${x} ${y})` : undefined}
    >
      {n}
    </text>
  )
}

function Arrow({ d, head }: { d: string; head: [number, number, number] }) {
  const [x, y, angle] = head
  return (
    <g>
      <path d={d} {...ink} />
      <path d="M -4 -3 L 0 0 L -4 3" {...ink} transform={`translate(${x} ${y}) rotate(${angle})`} />
    </g>
  )
}

function Scissors({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} {...ink} strokeWidth={1.2}>
      <circle cx={-6} cy={-3.5} r={2.6} />
      <circle cx={-6} cy={3.5} r={2.6} />
      <path d="M -3.8 -2 L 6 3 M -3.8 2 L 6 -3" />
    </g>
  )
}

/** The flat landscape sheet with the 2×4 grid. */
function MiniSheet({ numbers, slit }: { numbers?: boolean; slit?: boolean }) {
  return (
    <g>
      <rect x={10} y={12} width={100} height={60} rx={1} {...paper} />
      {[35, 60, 85].map((x) => (
        <line key={x} x1={x} y1={12} x2={x} y2={72} {...fold} />
      ))}
      <line x1={10} y1={42} x2={35} y2={42} {...fold} />
      <line x1={85} y1={42} x2={110} y2={42} {...fold} />
      <line x1={35} y1={42} x2={85} y2={42} {...(slit ? cut : fold)} />
      {numbers && (
        <>
          {[5, 4, 3, 2].map((n, i) => (
            <Num key={n} x={22.5 + i * 25} y={27} n={n} flip />
          ))}
          {[6, 7, 8, 1].map((n, i) => (
            <Num key={n} x={22.5 + i * 25} y={57} n={n} />
          ))}
          <circle cx={97.5} cy={57} r={7} {...ink} strokeWidth={1} />
        </>
      )}
    </g>
  )
}

/** A sheet folded along its long middle, seen from the front. */
function LongFold() {
  return (
    <g>
      {/* back half, then the front half over it: a long tent */}
      <path d="M 24 28 L 106 28 L 116 58 L 34 58 Z" {...paper} />
      <path d="M 24 28 L 106 28 L 96 64 L 14 64 Z" {...paper} />
    </g>
  )
}

function miniSteps(paperLabel: string): Step[] {
  return [
    { art: <MiniSheet numbers />, caption: `Imprime a una cara en ${paperLabel}, al 100 %.` },
    { art: <LongFold />, caption: 'Dobla a lo largo por la mitad y desdobla.' },
    {
      art: (
        <g>
          <path d="M 14 22 L 37 28 L 37 66 L 14 60 Z" {...paper} />
          <path d="M 37 28 L 60 22 L 60 60 L 37 66 Z" {...paper} />
          <path d="M 60 22 L 83 28 L 83 66 L 60 60 Z" {...paper} />
          <path d="M 83 28 L 106 22 L 106 60 L 83 66 Z" {...paper} />
        </g>
      ),
      caption: 'Dóblala en 8 rectángulos, como un acordeón, y desdobla.',
    },
    {
      art: (
        <g>
          <rect x={34} y={12} width={60} height={60} rx={1} {...paper} />
          <line x1={34} y1={12} x2={34} y2={72} {...ink} strokeWidth={2.4} />
          <line x1={64} y1={12} x2={64} y2={72} {...fold} />
          <line x1={64} y1={42} x2={94} y2={42} {...fold} />
          <line x1={34} y1={42} x2={64} y2={42} {...cut} />
          <Arrow d="M 6 42 L 28 42" head={[29, 42, 0]} />
          <Scissors x={50} y={33} />
        </g>
      ),
      caption: 'Dobla por la mitad y corta desde el doblez hasta el centro.',
    },
    { art: <MiniSheet slit />, caption: 'Abre la hoja: queda una ranura en el medio.' },
    { art: <LongFold />, caption: 'Vuelve a doblarla a lo largo.' },
    {
      art: (
        <g>
          <path d="M 40 34 L 14 38 L 14 64 L 40 62 Z" {...paper} />
          <path d="M 80 34 L 106 38 L 106 64 L 80 62 Z" {...paper} />
          <path d="M 40 34 L 60 18 L 60 50 L 40 62 Z" {...paper} />
          <path d="M 80 34 L 60 18 L 60 50 L 80 62 Z" {...paper} />
          <path d="M 40 62 L 60 72 L 80 62" {...ink} />
          <line x1={60} y1={50} x2={60} y2={72} {...fold} />
          <Arrow d="M 2 52 L 10 52" head={[11, 52, 0]} />
          <Arrow d="M 118 52 L 110 52" head={[109, 52, 180]} />
        </g>
      ),
      caption: 'Empuja los extremos hacia el centro para que se abra.',
    },
    {
      art: (
        <g>
          {[0, 2, 4].map((o) => (
            <path key={o} d={`M ${46 - o} ${22 + o} L ${46 - o} ${68 + o}`} {...ink} strokeWidth={1} />
          ))}
          <rect x={48} y={18} width={30} height={48} rx={1} {...paper} />
          <path d="M 48 18 L 44 22 L 44 70 L 48 66" {...ink} />
          <Num x={63} y={42} n={1} />
        </g>
      ),
      caption: 'Cierra el librito: la portada queda afuera.',
    },
  ]
}

function bookletSteps(paperLabel: string, pages: number): Step[] {
  const n = padToMultiple(Math.max(pages, 4), 4)
  return [
    {
      art: (
        <g>
          <rect x={8} y={14} width={96} height={56} rx={1} {...paper} />
          <line x1={56} y1={14} x2={56} y2={70} {...fold} />
          <Num x={32} y={42} n={n} />
          <Num x={80} y={42} n={1} />
          <Arrow d="M 106 12 C 120 22, 120 62, 106 72" head={[106, 72, 160]} />
        </g>
      ),
      caption: `Imprime a doble cara en ${paperLabel}, con volteo por el borde corto, al 100 %.`,
    },
    {
      art: (
        <g>
          {[8, 4, 0].map((o) => (
            <rect key={o} x={14 + o} y={14 + o} width={84} height={50} rx={1} {...paper} />
          ))}
        </g>
      ),
      caption: 'Apila las hojas en el orden en que salen de la impresora.',
    },
    {
      art: (
        <g>
          <path d="M 18 22 L 60 30 L 60 72 L 18 64 Z" {...paper} />
          <path d="M 60 30 L 102 22 L 102 64 L 60 72 Z" {...paper} />
          <line x1={60} y1={30} x2={60} y2={72} {...fold} />
          <Arrow d="M 96 12 C 84 4, 70 6, 64 14" head={[64, 14, 125]} />
        </g>
      ),
      caption: 'Dóblalas juntas por la mitad.',
    },
    {
      art: (
        <g>
          <rect x={40} y={14} width={44} height={58} rx={1} {...paper} />
          <line x1={40} y1={14} x2={40} y2={72} {...ink} strokeWidth={2.4} />
          {[28, 58].map((y) => (
            <rect key={y} x={38} y={y - 4} width={4} height={8} rx={1} {...ink} strokeWidth={1.2} />
          ))}
          <Num x={62} y={43} n={1} />
        </g>
      ),
      caption: 'Grapa por el doblez, con dos grapas.',
    },
  ]
}

function looseSteps(bleed: number, cropMarks: boolean): Step[] {
  const extras = [bleed > 0 && `${bleed} mm de sangrado`, cropMarks && 'marcas de corte'].filter(Boolean).join(' y ')
  const marks = [
    [30, 14],
    [90, 14],
    [30, 70],
    [90, 70],
  ]
  return [
    {
      art: (
        <g>
          <rect x={30} y={14} width={60} height={56} rx={1} {...paper} />
          <rect x={26} y={10} width={68} height={64} {...fold} />
          {marks.map(([x, y]) => (
            <g key={`${x}${y}`}>
              <line x1={x} y1={y < 40 ? 2 : 82} x2={x} y2={y < 40 ? 7 : 77} {...ink} strokeWidth={1} />
              <line x1={x < 60 ? 18 : 102} y1={y} x2={x < 60 ? 23 : 97} y2={y} {...ink} strokeWidth={1} />
            </g>
          ))}
        </g>
      ),
      caption: `Envía el PDF a la imprenta tal cual${extras ? `: lleva ${extras}` : ''}.`,
    },
    {
      art: (
        <g>
          <rect x={30} y={14} width={60} height={56} rx={1} {...paper} />
          <line x1={14} y1={14} x2={106} y2={14} {...cut} />
          <Scissors x={112} y={14} />
        </g>
      ),
      caption: 'Se corta por las marcas y cada página queda a su tamaño.',
    },
  ]
}

export function FoldGuide({ format, paper: paperId, pages, bleed, cropMarks }: Props) {
  const label = PAPER[paperId].label
  const steps = format === 'mini' ? miniSteps(label) : format === 'booklet' ? bookletSteps(label, pages) : looseSteps(bleed, cropMarks)

  return (
    <section aria-labelledby="fold-guide" className="w-full rounded-(--paper-radius) bg-(--paper-sheet) p-6 text-(--paper-ink) shadow-(--paper-shadow) sm:p-8">
      <svg width={0} height={0} className="absolute" aria-hidden>
        <filter id="hand-drawn">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={3.2} />
        </filter>
      </svg>
      <h2 id="fold-guide" className="font-hand text-[22px] font-semibold">
        Cómo armarlo
      </h2>
      <ol className="mt-5 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.caption} className="animate-land flex flex-col gap-2" style={{ animationDelay: `${i * 60}ms` }}>
            <svg viewBox="0 0 120 84" className="w-full" aria-hidden>
              <g filter="url(#hand-drawn)">{s.art}</g>
            </svg>
            <p className="font-hand text-[13px] leading-snug text-pretty">
              <span className="font-semibold">{i + 1}.</span> {s.caption}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

import { cn } from '@cloudflare/kumo/utils'
import { ArrowRightIcon, ImagesIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { FORMATS, PAPER, summary, type FormatId, type PaperId } from '../lib/formats'
import { sheetSides } from '../lib/imposition'
import type { Project } from '../lib/model'
import { isPhotoFile } from '../lib/photos'
import { useViewport } from '../state/viewport'
import { CtaButton, Divider, Dock, Segment } from './Chrome'
import { Sheet } from './Sheet'
import { Slug } from './Slug'

interface Props {
  draft: Project | null
  onResume: () => void
  onStart: (format: FormatId, paper: PaperId, files: File[]) => void
}

const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86_400_000)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

const SHORT: Record<FormatId, string> = { mini: 'Mini-zine', booklet: 'Cuadernillo', loose: 'Sueltas' }

export function StartScreen({ draft, onResume, onStart }: Props) {
  const [format, setFormat] = useState<FormatId>('mini')
  const [paper, setPaper] = useState<PaperId>('letter')
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const vp = useViewport()

  const f = FORMATS[format]
  const size = format === 'loose' ? f.pageSize(paper) : PAPER[paper]
  const pages = format === 'loose' ? 1 : f.defaultPages
  const side = sheetSides(format, size, format === 'loose' ? 1 : pages)[0]
  const pxPerMm = Math.min((vp.w - 80) / size.w, (vp.h - 280) / size.h, format === 'loose' ? 2.2 : 2.6)
  const start = (files: File[]) => onStart(format, paper, files.filter(isPhotoFile))

  return (
    <main
      className="mat relative flex min-h-full flex-col items-center justify-center gap-5 px-4 pt-20 pb-28"
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        start([...e.dataTransfer.files])
      }}
    >
      <div className="fixed top-4 left-4 z-20 flex h-10 items-center sm:left-5">
        <span className="text-[15px] font-semibold tracking-tight text-kumo-default">zine studio</span>
      </div>

      {draft && (
        <button
          onClick={onResume}
          className="group fixed top-4 right-4 z-20 flex h-10 items-center gap-2 rounded-full bg-(--float-bg) pr-3 pl-4 text-[13px] text-kumo-default shadow-(--float-shadow) ring-1 ring-(--float-ring) backdrop-blur-md sm:right-5"
        >
          <span className="font-medium">Continuar borrador</span>
          <Slug className="hidden sm:inline">
            {draft.pages.length} pp · {ago(draft.updatedAt)}
          </Slug>
          <ArrowRightIcon size={14} className="text-kumo-subtle transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-0.5" />
        </button>
      )}

      <Slug>{summary(format, paper, f.defaultPages)}</Slug>

      <button
        key={`${format}-${paper}`}
        onClick={() => input.current?.click()}
        aria-label={`Elegir fotos para un ${f.name.toLowerCase()} en ${PAPER[paper].label}`}
        className={cn(
          'animate-land rounded-sm outline-none transition-transform duration-(--dur-fast) ease-(--ease-out) focus-visible:ring-2 focus-visible:ring-kumo-focus',
          over ? '-translate-y-1 scale-[1.01]' : 'hover:-translate-y-0.5',
        )}
      >
        <Sheet
          format={format}
          size={size}
          side={side}
          pxPerMm={pxPerMm}
          renderCell={(c) => (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-(--paper-ink)">
              <span className="text-[clamp(18px,4vw,40px)] font-light tabular-nums opacity-25">{c.number}</span>
              {c.number === 1 && <span className="font-mono text-[9px] tracking-[0.08em] uppercase opacity-40">portada</span>}
            </div>
          )}
        />
      </button>

      <p className="max-w-sm text-center text-sm leading-snug text-kumo-subtle">
        {over ? 'Suelta para empezar.' : 'Suelta fotos sobre la hoja. Se acomodan solas en las páginas.'}
        <br />
        <button onClick={() => start([])} className="text-kumo-default underline decoration-kumo-interact underline-offset-3 hover:decoration-kumo-default">
          Empezar en blanco
        </button>
      </p>

      <Slug className="fixed bottom-6 left-5 hidden lg:block">Nada se sube · todo pasa en este navegador</Slug>

      <Dock label="Formato">
        <div role="radiogroup" aria-label="Formato" className="flex">
          {(Object.keys(FORMATS) as FormatId[]).map((id) => (
            <Segment key={id} selected={format === id} onClick={() => setFormat(id)} title={FORMATS[id].name}>
              {SHORT[id]}
            </Segment>
          ))}
        </div>
        <Divider />
        <div role="radiogroup" aria-label="Papel" className="flex">
          {(['letter', 'a4'] as PaperId[]).map((p) => (
            <Segment key={p} selected={paper === p} onClick={() => setPaper(p)}>
              {PAPER[p].label}
            </Segment>
          ))}
        </div>
        <Divider />
        <CtaButton onClick={() => input.current?.click()} className="h-8 rounded-[11px] px-3">
          <ImagesIcon size={16} weight="bold" />
          <span className="hidden sm:inline">Elegir fotos</span>
        </CtaButton>
      </Dock>

      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => start([...(e.target.files ?? [])])}
      />
    </main>
  )
}

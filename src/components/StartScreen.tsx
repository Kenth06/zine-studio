import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { cn } from '@cloudflare/kumo/utils'
import { ArrowRightIcon, ImagesIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { FORMATS, PAPER, summary, type FormatId, type PaperId } from '../lib/formats'
import { sheetSides } from '../lib/imposition'
import type { Project } from '../lib/model'
import { isPhotoFile } from '../lib/photos'
import { useViewport } from '../state/viewport'
import { CtaButton, Divider, Dock, SegmentGroup } from './Chrome'
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
  // Files waiting for the user to confirm replacing the existing draft.
  const [pending, setPending] = useState<File[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const vp = useViewport()

  const f = FORMATS[format]
  const size = format === 'loose' ? f.pageSize(paper) : PAPER[paper]
  const pages = format === 'loose' ? 1 : f.defaultPages
  const side = sheetSides(format, size, pages)[0]
  const pxPerMm = Math.min((vp.w - 64) / size.w, (vp.h - 300) / size.h, format === 'loose' ? 2.2 : 2.6)

  const start = (files: File[]) => {
    const photos = files.filter(isPhotoFile)
    if (draft) setPending(photos)
    else onStart(format, paper, photos)
  }

  return (
    <main
      className="mat relative flex min-h-full flex-col items-center justify-center gap-5 px-4 pt-20 pb-36 sm:pb-28"
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
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-20 flex h-10 items-center sm:left-5">
        <h1 className="text-[15px] font-semibold tracking-tight text-kumo-default">zine studio</h1>
      </div>

      {draft && (
        <button
          onClick={onResume}
          className="focus-ring group fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 flex h-10 items-center gap-2 rounded-full bg-(--float-bg) pr-3 pl-4 text-[13px] text-kumo-default shadow-(--float-shadow) ring-1 ring-(--float-ring) backdrop-blur-md sm:right-5"
        >
          <span className="font-medium">Continuar borrador</span>
          <ArrowRightIcon size={14} className="text-kumo-subtle transition-transform duration-(--dur-fast) ease-out group-hover:translate-x-0.5" />
        </button>
      )}

      <Slug className="text-center">{summary(format, paper, f.defaultPages)}</Slug>

      <button
        key={`${format}-${paper}`}
        onClick={() => input.current?.click()}
        aria-label={`Elegir fotos para un ${f.name.toLowerCase()} en ${PAPER[paper].label}`}
        className={cn(
          'focus-ring animate-land rounded-sm transition-transform duration-(--dur-fast) ease-out',
          over ? '-translate-y-1 scale-[1.01]' : 'hover:-translate-y-0.5',
        )}
      >
        <Sheet
          format={format}
          size={size}
          side={side}
          pxPerMm={pxPerMm}
          renderCell={(c) => (
            <div aria-hidden className="flex size-full flex-col items-center justify-center gap-1 text-(--paper-ink)">
              <span className="text-[clamp(16px,4vw,40px)] font-light tabular-nums opacity-25">{c.number}</span>
              {c.number === 1 && <span className="font-mono text-[9px] tracking-[0.08em] uppercase opacity-60">portada</span>}
            </div>
          )}
        />
      </button>

      <div className="flex flex-col items-center">
        <button
          onClick={() => start([])}
          className="focus-ring rounded px-2 py-1.5 text-sm text-kumo-default underline decoration-kumo-interact underline-offset-3 hover:decoration-kumo-default"
        >
          Empezar en blanco
        </button>
      </div>

      <Dock label="Nuevo zine" className="flex-wrap justify-center sm:flex-nowrap">
        <SegmentGroup
          label="Formato"
          value={format}
          onChange={setFormat}
          options={(Object.keys(FORMATS) as FormatId[]).map((id) => ({ value: id, label: SHORT[id], title: FORMATS[id].name }))}
        />
        <span className="hidden sm:contents">
          <Divider />
        </span>
        <SegmentGroup
          label="Papel"
          value={paper}
          onChange={setPaper}
          options={(['letter', 'a4'] as PaperId[]).map((p) => ({ value: p, label: PAPER[p].label }))}
        />
        <span className="hidden sm:contents">
          <Divider />
        </span>
        <CtaButton onClick={() => input.current?.click()} className="h-8 rounded-[11px] px-3">
          <ImagesIcon size={16} weight="bold" />
          Elegir fotos
        </CtaButton>
      </Dock>

      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          start([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />

      <Dialog.Root role="alertdialog" open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <Dialog size="sm" className="flex flex-col gap-4 p-6">
          <Dialog.Title className="text-base font-semibold text-balance">¿Empezar un zine nuevo?</Dialog.Title>
          <Dialog.Description className="text-sm text-pretty text-kumo-subtle">
            {draft &&
              `Tu borrador de ${draft.pages.length} páginas (editado ${ago(draft.updatedAt)}) se reemplaza y sus fotos se borran de este navegador.`}
          </Dialog.Description>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="destructive"
              onClick={() => {
                const files = pending ?? []
                setPending(null)
                onStart(format, paper, files)
              }}
            >
              Reemplazar
            </Button>
            <Button
              variant="secondary"
              autoFocus
              onClick={() => {
                setPending(null)
                onResume()
              }}
            >
              Continuar borrador
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </main>
  )
}

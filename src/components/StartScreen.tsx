import { Button } from '@cloudflare/kumo/components/button'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { cn } from '@cloudflare/kumo/utils'
import { ArrowRightIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { FORMATS, summary, type FormatId, type PaperId } from '../lib/formats'
import type { Project } from '../lib/model'
import { isPhotoFile } from '../lib/photos'
import { FormatDiagram } from './Diagrams'
import { Slug } from './Slug'

interface Props {
  draft: Project | null
  onResume: () => void
  onStart: (format: FormatId, paper: PaperId, files: File[]) => void
}

const ago = (t: number) => {
  const d = Math.round((Date.now() - t) / 86_400_000)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

export function StartScreen({ draft, onResume, onStart }: Props) {
  const [format, setFormat] = useState<FormatId>('mini')
  const [paper, setPaper] = useState<PaperId>('letter')
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const start = (files: File[]) => onStart(format, paper, files.filter(isPhotoFile))

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight text-kumo-default">zine studio</h1>
        <Slug>Nada se sube · todo pasa en este navegador</Slug>
      </header>

      {draft && (
        <button
          onClick={onResume}
          className="group flex items-center justify-between rounded-lg bg-kumo-base px-4 py-3 text-left ring-1 ring-kumo-hairline transition-colors duration-(--dur-quick) hover:bg-kumo-elevated"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-kumo-default">Continuar borrador</span>
            <span className="text-xs text-kumo-subtle">
              {FORMATS[draft.format].name} · {summary(draft.format, draft.paper, draft.pages.length)} · editado {ago(draft.updatedAt)}
            </span>
          </span>
          <ArrowRightIcon size={16} className="text-kumo-subtle transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-0.5" />
        </button>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-kumo-default">Formato</h2>
          <Tabs
            size="sm"
            value={paper}
            onValueChange={(v) => setPaper(v as PaperId)}
            tabs={[
              { value: 'letter', label: 'Carta' },
              { value: 'a4', label: 'A4' },
            ]}
          />
        </div>
        <div role="radiogroup" aria-label="Formato" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.values(FORMATS).map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={format === f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                'flex flex-col gap-3 rounded-lg bg-kumo-base p-4 text-left ring-1 transition-[box-shadow,background-color] duration-(--dur-quick)',
                format === f.id ? 'ring-2 ring-kumo-focus' : 'ring-kumo-hairline hover:bg-kumo-elevated',
              )}
            >
              <span className="text-kumo-default">
                <FormatDiagram format={f.id} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium text-kumo-default">{f.name}</span>
                <span className="text-xs leading-snug text-kumo-subtle">{f.howTo(paper)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          start([...e.dataTransfer.files])
        }}
        className={cn(
          'flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center transition-colors duration-(--dur-quick)',
          over ? 'border-kumo-focus bg-kumo-elevated' : 'border-kumo-interact',
        )}
      >
        <UploadSimpleIcon size={20} className="text-kumo-subtle" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-kumo-default">Suelta tus fotos aquí</p>
          <p className="text-xs text-kumo-subtle">JPEG, PNG, HEIC o WebP. Se acomodan solas en las páginas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => input.current?.click()}>
            Elegir fotos
          </Button>
          <Button variant="ghost" onClick={() => start([])}>
            Empezar sin fotos
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => start([...(e.target.files ?? [])])}
        />
      </section>
    </main>
  )
}

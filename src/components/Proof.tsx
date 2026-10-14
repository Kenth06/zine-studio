import { DownloadSimpleIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FORMATS, PAPER, type PaperId } from '../lib/formats'
import { padToMultiple, sheetSides, type PrintSide } from '../lib/imposition'
import type { PhotoMeta, Project } from '../lib/model'
import type { ExportMode } from '../lib/pdf'
import { download, exportPdf } from '../lib/photos'
import { useViewport } from '../state/viewport'
import { CtaButton, Dock, DockButton, FloatButton, SegmentGroup } from './Chrome'
import { StaticPage } from './PageView'
import { Sheet } from './Sheet'
import { Slug } from './Slug'

interface Props {
  project: Project
  photos: Map<string, PhotoMeta>
  thumbs: Record<string, string>
  lowDpi: number
  emptySlots: number
  emptyTexts: number
  onClose: () => void
  onPaper: (paper: PaperId) => void
  onPrint: (bleed: number | undefined, cropMarks: boolean | undefined) => void
  onDone: (filename: string) => void
  onError: (message: string) => void
}

function steps(p: Project): string[] {
  const paper = PAPER[p.paper].label
  if (p.format === 'mini')
    return [
      `Imprime a una cara en ${paper}, al 100 % (tamaño real).`,
      'Dobla la hoja por las líneas punteadas.',
      'Corta solo la línea continua del centro.',
      'Abre el corte, empuja hacia el centro y cierra como un librito. La portada queda afuera.',
    ]
  if (p.format === 'booklet') {
    const sheets = padToMultiple(p.pages.length, 4) / 4
    return [
      `Imprime a doble cara en ${paper}, con volteo por el borde corto, al 100 %.`,
      `Apila ${sheets === 1 ? 'la hoja' : `las ${sheets} hojas`} en el orden en que salen y dóblalas juntas por la mitad.`,
      'Grapa por el doblez, con dos grapas.',
    ]
  }
  return [
    `Cada página lleva ${p.bleed} mm de sangrado${p.cropMarks ? ' y marcas de corte' : ''}.`,
    'Envía el PDF a la imprenta tal cual. Las fotos ya van a 300 ppp como máximo.',
  ]
}

function sideLabel(format: Project['format'], s: PrintSide, sheets: number) {
  if (format === 'mini') return 'Hoja 1 de 1 · una cara'
  if (format === 'loose') return `Página ${s.sheet + 1}`
  return `Hoja ${s.sheet + 1} de ${sheets} · ${s.side === 'front' ? 'frente' : 'reverso'}`
}

const filename = (p: Project, mode: ExportMode) =>
  `zine-${p.pages.length}pp-${p.paper === 'letter' ? 'carta' : 'a4'}-${mode === 'print' ? 'imprimir' : 'leer'}.pdf`

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Export as a print proof: the real imposed sheets, then the download. A modal over the whole app. */
export function Proof(p: Props) {
  const { project } = p
  const vp = useViewport()
  const [busy, setBusy] = useState<ExportMode | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const dialog = useRef<HTMLDivElement>(null)

  const loose = project.format === 'loose'
  const pageSize = FORMATS[project.format].pageSize(project.paper)
  const sheet = loose ? pageSize : PAPER[project.paper]
  const sides = sheetSides(project.format, sheet, project.pages.length)
  const sheets = Math.max(...sides.map((s) => s.sheet)) + 1
  const blanks = project.format === 'booklet' ? padToMultiple(project.pages.length, 4) - project.pages.length : 0

  const column = vp.w >= 1024 ? Math.min(vp.w - 420, 820) : vp.w - 32
  const target = loose ? Math.min(column / 2 - 24, 260) : column - 40
  const pxPerMm = target / sheet.w

  // Modal: the editor behind becomes inert, focus starts on close, Escape closes.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    document.documentElement.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => {
      root?.removeAttribute('inert')
      document.documentElement.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && p.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, p])

  const run = async (mode: ExportMode) => {
    setBusy(mode)
    setProgress(null)
    try {
      const bytes = await exportPdf(project, mode, { onProgress: (d, t) => setProgress([d, t]) })
      const name = filename(project, mode)
      download(bytes, name)
      p.onDone(name)
    } catch (err) {
      p.onError(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  const notes = [
    blanks > 0 && `${plural(blanks, 'página en blanco', 'páginas en blanco')} antes de la contraportada, para completar el pliego.`,
    p.emptySlots > 0 && `${plural(p.emptySlots, 'hueco de foto vacío', 'huecos de foto vacíos')} sale en blanco.`,
    p.emptyTexts > 0 && `${plural(p.emptyTexts, 'página con texto vacío', 'páginas con texto vacío')}.`,
  ].filter(Boolean) as string[]

  return createPortal(
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-title"
      className="mat fixed inset-0 z-40 overflow-y-auto overscroll-contain outline-hidden"
    >
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-20 flex items-center gap-3 sm:left-5">
        <FloatButton aria-label="Volver al editor" onClick={p.onClose} disabled={!!busy}>
          <XIcon size={16} />
        </FloatButton>
        <h1 id="proof-title" className="text-[15px] font-semibold tracking-tight text-kumo-default">
          Prueba de imprenta
        </h1>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-24 pb-36 lg:flex-row lg:items-start lg:justify-center">
        <div className={loose ? 'grid grid-cols-2 gap-x-2 gap-y-6' : 'flex flex-col items-center gap-10'}>
          {sides.map((s, i) => (
            <figure key={i} className="animate-land flex flex-col items-center gap-2" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
              <Sheet
                format={project.format}
                size={sheet}
                side={s}
                pxPerMm={pxPerMm}
                renderCell={(c) =>
                  c.page === null ? (
                    <div className="flex size-full items-center justify-center">
                      <Slug>en blanco</Slug>
                    </div>
                  ) : (
                    <StaticPage page={project.pages[c.page]} size={pageSize} pxPerMm={pxPerMm} photos={p.photos} thumbs={p.thumbs} />
                  )
                }
              />
              <figcaption>
                <Slug>{sideLabel(project.format, s, sheets)}</Slug>
              </figcaption>
            </figure>
          ))}
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-5 self-center lg:sticky lg:top-24 lg:w-72 lg:self-start">
          <h2 className="text-sm font-medium text-kumo-default">Cómo imprimir</h2>
          <ol className="flex flex-col gap-2.5">
            {steps(project).map((s, i) => (
              <li key={s} className="flex gap-3 text-sm leading-snug text-pretty text-kumo-default">
                <span className="font-mono text-[11px] leading-5 text-kumo-subtle tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-3 border-t border-kumo-hairline pt-4">
            <div className="flex flex-col gap-1.5">
              <Slug>Papel</Slug>
              <SegmentGroup
                label="Papel"
                value={project.paper}
                onChange={p.onPaper}
                itemClassName="h-7 px-2.5"
                options={(['letter', 'a4'] as PaperId[]).map((x) => ({ value: x, label: PAPER[x].label }))}
              />
            </div>
            {loose && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Slug>Sangrado</Slug>
                  <SegmentGroup
                    label="Sangrado"
                    value={project.bleed}
                    onChange={(mm) => p.onPrint(mm, undefined)}
                    className="flex-wrap gap-0.5"
                    itemClassName="h-7 px-2.5"
                    options={[0, 1, 2, 3, 4, 5].map((mm) => ({ value: mm, label: `${mm} mm` }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Slug>Marcas de corte</Slug>
                  <SegmentGroup
                    label="Marcas de corte"
                    value={project.cropMarks}
                    onChange={(v) => p.onPrint(undefined, v)}
                    itemClassName="h-7 px-2.5"
                    options={[
                      { value: true, label: 'Con marcas' },
                      { value: false, label: 'Sin marcas' },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {(notes.length > 0 || p.lowDpi > 0) && (
            <ul className="flex flex-col gap-1.5 border-t border-kumo-hairline pt-4 text-xs leading-snug text-pretty text-kumo-subtle">
              {p.lowDpi > 0 && <li className="text-kumo-warning">{plural(p.lowDpi, 'foto tiene', 'fotos tienen')} poca resolución para su tamaño.</li>}
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <Dock label="Descargar">
        {progress && (
          <Slug className="px-2 whitespace-nowrap" aria-live="polite">
            {progress[0]}/{progress[1]}
          </Slug>
        )}
        <DockButton onClick={() => run('read')} disabled={!!busy}>
          {busy === 'read' ? 'Generando…' : 'Para leer'}
        </DockButton>
        <CtaButton onClick={() => run('print')} disabled={!!busy} className="h-8 rounded-[11px] px-3">
          <DownloadSimpleIcon size={16} weight="bold" />
          {busy === 'print' ? 'Generando…' : (
            <>
              <span className="sm:hidden">Imprimir</span>
              <span className="hidden sm:inline">Descargar para imprimir</span>
            </>
          )}
        </CtaButton>
      </Dock>
    </div>,
    document.body,
  )
}

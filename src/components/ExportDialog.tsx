import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Select } from '@cloudflare/kumo/components/select'
import { Switch } from '@cloudflare/kumo/components/switch'
import { XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { PAPER, summary } from '../lib/formats'
import { padToMultiple } from '../lib/imposition'
import type { Project } from '../lib/model'
import type { ExportMode } from '../lib/pdf'
import { download, exportPdf } from '../lib/photos'
import { Slug } from './Slug'

interface Props {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  lowDpi: number
  emptySlots: number
  onPrint: (bleed: number | undefined, cropMarks: boolean | undefined) => void
  onError: (message: string) => void
  onDone: (filename: string) => void
}

function steps(p: Project): string[] {
  const paper = PAPER[p.paper].label
  if (p.format === 'mini')
    return [
      `Imprime a una cara en ${paper}, al 100 % (tamaño real).`,
      'Dobla la hoja en 8 rectángulos. Corta el doblez horizontal del centro, solo a lo largo de las dos columnas del medio.',
      'Abre el corte, empuja hacia el centro y dobla como un librito. La portada queda afuera.',
    ]
  if (p.format === 'booklet') {
    const sheets = padToMultiple(p.pages.length, 4) / 4
    return [
      `Imprime a doble cara en ${paper}, con volteo por el borde corto, al 100 %.`,
      `Apila las ${sheets} ${sheets === 1 ? 'hoja' : 'hojas'} en el orden en que salen y dóblalas juntas por la mitad.`,
      'Grapa por el doblez, con dos grapas.',
    ]
  }
  return [
    `Páginas sueltas con ${p.bleed} mm de sangrado${p.cropMarks ? ' y marcas de corte' : ''}.`,
    'Envía el PDF a la imprenta tal cual. Las fotos ya están a 300 ppp como máximo.',
  ]
}

const slugify = (p: Project, mode: ExportMode) =>
  `zine-${p.pages.length}pp-${p.paper === 'letter' ? 'carta' : 'a4'}-${mode === 'print' ? 'imprimir' : 'leer'}.pdf`

export function ExportDialog(p: Props) {
  const [busy, setBusy] = useState<ExportMode | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const project = p.project
  const blanks = project.format === 'booklet' ? padToMultiple(project.pages.length, 4) - project.pages.length : 0

  const run = async (mode: ExportMode) => {
    setBusy(mode)
    setProgress(null)
    try {
      const bytes = await exportPdf(project, mode, { onProgress: (d, t) => setProgress([d, t]) })
      const name = slugify(project, mode)
      download(bytes, name)
      p.onDone(name)
    } catch (err) {
      p.onError(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <Dialog.Root open={p.open} onOpenChange={(o) => !busy && p.onOpenChange(o)}>
      <Dialog size="lg" className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-base font-semibold">Exportar</Dialog.Title>
            <Slug>{summary(project.format, project.paper, project.pages.length)}</Slug>
          </div>
          <Dialog.Close
            aria-label="Cerrar"
            render={(props) => <Button {...props} variant="ghost" shape="square" size="sm" icon={XIcon} aria-label="Cerrar" />}
          />
        </div>

        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-snug text-kumo-default marker:text-kumo-subtle">
          {steps(project).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        {project.format === 'loose' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-kumo-elevated px-4 py-3 ring-1 ring-kumo-hairline">
            <Select
              label="Sangrado"
              hideLabel={false}
              value={String(project.bleed)}
              onValueChange={(v) => p.onPrint(Number(v), undefined)}
            >
              {[0, 1, 2, 3, 4, 5].map((mm) => (
                <Select.Option key={mm} value={String(mm)}>
                  {mm} mm
                </Select.Option>
              ))}
            </Select>
            <Switch label="Marcas de corte" checked={project.cropMarks} onCheckedChange={(v) => p.onPrint(undefined, v)} />
          </div>
        )}

        {(p.lowDpi > 0 || p.emptySlots > 0 || blanks > 0) && (
          <ul className="flex flex-col gap-1 text-xs leading-snug text-kumo-subtle">
            {blanks > 0 && <li>Se añadirán {blanks} {blanks === 1 ? 'página en blanco' : 'páginas en blanco'} antes de la contraportada para completar el pliego.</li>}
            {p.lowDpi > 0 && <li className="text-kumo-warning">{p.lowDpi} {p.lowDpi === 1 ? 'foto tiene' : 'fotos tienen'} poca resolución para su tamaño.</li>}
            {p.emptySlots > 0 && <li>{p.emptySlots} {p.emptySlots === 1 ? 'hueco vacío queda' : 'huecos vacíos quedan'} en blanco.</li>}
          </ul>
        )}

        <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Slug>{progress ? `Página ${progress[0]} de ${progress[1]}` : 'Se genera en tu navegador'}</Slug>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" loading={busy === 'read'} disabled={!!busy} onClick={() => run('read')}>
              Descargar para leer
            </Button>
            <Button variant="primary" loading={busy === 'print'} disabled={!!busy} onClick={() => run('print')}>
              Descargar para imprimir
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}

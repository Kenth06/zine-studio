import { Badge } from '@cloudflare/kumo/components/badge'
import { Button } from '@cloudflare/kumo/components/button'
import { Empty } from '@cloudflare/kumo/components/empty'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { cn } from '@cloudflare/kumo/utils'
import { ImagesIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useRef } from 'react'
import { dpiLevel } from '../lib/crop'
import type { PhotoMeta } from '../lib/model'
import { PHOTO_MIME } from './PageView'
import { Slug } from './Slug'

interface Props {
  photos: PhotoMeta[]
  thumbs: Record<string, string>
  /** Lowest effective DPI where each photo is used; absent = unused. */
  worstDpi: Map<string, number>
  importing: number
  canAssign: boolean
  onFiles: (files: File[]) => void
  onPick: (id: string) => void
  onRemove: (id: string) => void
}

export function PhotoTray(p: Props) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <LayerCard className="flex min-h-0 flex-1 flex-col">
      <LayerCard.Secondary className="flex items-center justify-between">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium">Fotos</span>
          <Slug>{p.importing ? `Leyendo ${p.importing}…` : p.photos.length}</Slug>
        </span>
        <Button variant="ghost" size="sm" shape="square" icon={PlusIcon} aria-label="Añadir fotos" onClick={() => input.current?.click()} />
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            p.onFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </LayerCard.Secondary>
      <LayerCard.Primary className="min-h-0 flex-1 overflow-y-auto">
        {p.photos.length === 0 ? (
          <Empty
            size="sm"
            icon={<ImagesIcon size={24} />}
            title="Sin fotos"
            description="Arrastra fotos a la ventana o pégalas con Ctrl+V."
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {p.photos.map((photo) => {
                const dpi = p.worstDpi.get(photo.id)
                const level = dpi === undefined ? null : dpiLevel(dpi)
                return (
                  <li key={photo.id} className="group relative">
                    <button
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(PHOTO_MIME, photo.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => p.onPick(photo.id)}
                      aria-label={`${photo.name}${p.canAssign ? ', poner en el hueco elegido' : ''}`}
                      title={photo.name}
                      className={cn(
                        'block aspect-square w-full overflow-hidden rounded-md bg-kumo-recessed ring-1 ring-kumo-hairline',
                        'transition-transform duration-(--dur-quick) ease-(--ease-out) active:scale-[0.97]',
                        dpi === undefined && 'opacity-60',
                      )}
                    >
                      {p.thumbs[photo.id] && (
                        <img src={p.thumbs[photo.id]} alt="" draggable={false} className="h-full w-full object-cover" />
                      )}
                    </button>
                    {level && level !== 'ok' && (
                      <Badge variant={level === 'bad' ? 'error' : 'warning'} className="pointer-events-none absolute bottom-1 left-1 tabular-nums">
                        {dpi} ppp
                      </Badge>
                    )}
                    <Button
                      variant="secondary"
                      size="xs"
                      shape="circle"
                      icon={XIcon}
                      aria-label={`Quitar ${photo.name}`}
                      onClick={() => p.onRemove(photo.id)}
                      className="absolute top-1 right-1 opacity-0 transition-opacity duration-(--dur-quick) group-hover:opacity-100 focus-visible:opacity-100"
                    />
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs leading-snug text-kumo-subtle">
              {p.canAssign ? 'Toca una foto para ponerla en el hueco elegido, o arrástrala a cualquier página.' : 'Arrastra una foto a una página, o elige un hueco y toca la foto.'}
            </p>
          </>
        )}
      </LayerCard.Primary>
    </LayerCard>
  )
}

import { cn } from '@cloudflare/kumo/utils'
import type { ReactNode } from 'react'

/** Small uppercase metadata in mono, like the slug line on a print proof. */
export function Slug({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.06em] text-kumo-subtle tabular-nums', className)}>
      {children}
    </span>
  )
}

import { cn } from '@cloudflare/kumo/utils'
import type { ReactNode } from 'react'

/** Small uppercase metadata label, like the slug line on a print proof. */
export function Slug({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10.5px] font-medium uppercase tracking-[0.08em] text-kumo-subtle tabular-nums', className)}>
      {children}
    </span>
  )
}

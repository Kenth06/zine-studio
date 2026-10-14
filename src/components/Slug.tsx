import { cn } from '@cloudflare/kumo/utils'
import type { ComponentProps } from 'react'

/** Small uppercase metadata in mono, like the slug line on a print proof. */
export function Slug({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={cn('font-mono text-[10.5px] uppercase tracking-[0.06em] text-kumo-subtle tabular-nums', className)} />
}

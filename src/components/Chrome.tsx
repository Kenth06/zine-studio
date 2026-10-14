import { cn } from '@cloudflare/kumo/utils'
import type { ComponentProps, ReactNode } from 'react'

/**
 * The floating chrome around the work: round corner buttons, the bottom dock,
 * and the one call-to-action pill. Nothing here sits in a panel.
 */

const floating = 'bg-(--float-bg) shadow-(--float-shadow) ring-1 ring-(--float-ring) backdrop-blur-md'

export function FloatButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        floating,
        'flex size-10 shrink-0 items-center justify-center rounded-full text-kumo-subtle',
        'transition-[color,transform] duration-(--dur-quick) ease-(--ease-out) hover:text-kumo-default active:scale-95',
        'outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus',
        className,
      )}
    />
  )
}

export function CtaButton({ className, children, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-full bg-kumo-brand px-4 text-[13px] font-medium text-white shadow-(--cta-shadow)',
        'transition-[background-color,transform,opacity] duration-(--dur-quick) ease-(--ease-out) hover:bg-kumo-brand-hover active:scale-[0.97]',
        'outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kumo-canvas',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Dock({ className, children, label }: { className?: string; children: ReactNode; label: string }) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        floating,
        'animate-rise fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-1 rounded-(--radius-dock) p-1.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Bar({ className, children, label }: { className?: string; children: ReactNode; label: string }) {
  return (
    <div role="toolbar" aria-label={label} className={cn(floating, 'animate-land flex items-center gap-1 rounded-[14px] p-1', className)}>
      {children}
    </div>
  )
}

export const Divider = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-kumo-hairline" />

export function Segment({
  selected,
  className,
  ...props
}: ComponentProps<'button'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      {...props}
      className={cn(
        'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[13px] whitespace-nowrap',
        'transition-colors duration-(--dur-quick) outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus',
        selected ? 'bg-kumo-contrast font-medium text-kumo-inverse' : 'text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default',
        className,
      )}
    />
  )
}

export function IconButton({ className, ...props }: ComponentProps<'button'> & { 'aria-label': string }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[10px] text-kumo-subtle',
        'transition-colors duration-(--dur-quick) hover:bg-kumo-tint hover:text-kumo-default',
        'outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus disabled:pointer-events-none disabled:opacity-35',
        className,
      )}
    />
  )
}

/** A slider that reads like a field: label inside, value on the right, tick marks behind. */
export function FieldSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  className?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className={cn('relative flex h-8 items-center overflow-hidden rounded-[10px] bg-kumo-tint px-3 text-[12px]', className)}>
      <span aria-hidden className="absolute inset-y-0 left-0 bg-kumo-fill" style={{ width: `${pct}%` }} />
      <span
        aria-hidden
        className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2"
        style={{ backgroundImage: 'linear-gradient(90deg, var(--mat-dot) 1px, transparent 1px)', backgroundSize: '8px 100%' }}
      />
      <span className="relative font-medium text-kumo-default">{label}</span>
      <span className="relative ml-auto pl-3 font-mono text-[11px] text-kumo-subtle tabular-nums">{format(value)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="absolute inset-0 cursor-ew-resize opacity-0"
      />
    </label>
  )
}

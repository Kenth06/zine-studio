import { Tooltip } from '@cloudflare/kumo/components/tooltip'
import { cn } from '@cloudflare/kumo/utils'
import { useRef, type ComponentProps, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'

type Side = 'top' | 'bottom' | 'left' | 'right'

/** Wrap a control in a grouped tooltip: the first one waits, the next ones open instantly. */
function withTip(title: string | undefined, side: Side, el: ReactElement) {
  return title ? <Tooltip content={title} side={side} render={el} /> : el
}

/**
 * The floating chrome around the work: round corner buttons, the bottom dock,
 * the contextual bar, and the one call-to-action pill. Nothing here sits in a panel.
 */

const floating = 'bg-(--float-bg) shadow-(--float-shadow) ring-1 ring-(--float-ring) backdrop-blur-md'
const press = 'transition-[color,background-color,scale] duration-(--dur-quick) ease-out active:scale-[0.96]'

export function FloatButton({ className, title, tipSide = 'bottom', ...props }: ComponentProps<'button'> & { tipSide?: Side }) {
  return withTip(
    title,
    tipSide,
    <button
      type="button"
      {...props}
      className={cn(floating, press, 'focus-ring flex size-10 shrink-0 items-center justify-center rounded-full text-kumo-subtle hover:text-kumo-default', className)}
    />,
  )
}

export function CtaButton({ className, children, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        press,
        'focus-ring flex h-10 shrink-0 items-center gap-2 rounded-full bg-kumo-brand px-4 text-[13px] font-medium whitespace-nowrap text-white shadow-(--cta-shadow) hover:bg-kumo-brand-hover',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Bottom-centre floating bar. Scrolls sideways instead of overflowing on narrow screens. */
export function Dock({ className, children, label }: { className?: string; children: ReactNode; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex justify-center">
      <div
        role="toolbar"
        aria-label={label}
        className={cn(
          floating,
          'animate-rise no-scrollbar pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-(--radius-dock) p-1.5',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Contextual bar for the selected thing; one at a time. */
export function Bar({ className, children, label }: { className?: string; children: ReactNode; label: string }) {
  return (
    <div role="toolbar" aria-label={label} className={cn(floating, 'animate-fade no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-[14px] p-1', className)}>
      {children}
    </div>
  )
}

export const Divider = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-kumo-hairline" />

const segment = 'focus-ring flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[13px] whitespace-nowrap transition-colors duration-(--dur-quick)'

/** A plain action styled like a segment, for docks and bars. */
export function DockButton({ className, ...props }: ComponentProps<'button'>) {
  return <button type="button" {...props} className={cn(segment, 'text-kumo-default hover:bg-kumo-tint disabled:opacity-50', className)} />
}

/**
 * Radio group with roving focus: one Tab stop, arrow keys move and select.
 * Options render as segments; the selected one is solid ink.
 */
export function SegmentGroup<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
  className,
  itemClassName,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
  className?: string
  itemClassName?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : step ? (index + step + options.length) % options.length : -1
    if (to < 0) return
    e.preventDefault()
    onChange(options[to].value)
    refs.current[to]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex', className)} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = i === index
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              segment,
              on ? 'bg-kumo-contrast font-medium text-kumo-inverse' : 'text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default',
              itemClassName,
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function IconButton({ className, title, tipSide = 'top', ...props }: ComponentProps<'button'> & { 'aria-label': string; tipSide?: Side }) {
  return withTip(
    title,
    tipSide,
    <button
      type="button"
      {...props}
      className={cn(
        'focus-ring flex size-8 shrink-0 items-center justify-center rounded-[10px] text-kumo-subtle',
        'transition-colors duration-(--dur-quick) hover:bg-kumo-tint hover:text-kumo-default disabled:pointer-events-none disabled:opacity-35',
        className,
      )}
    />,
  )
}

/** A slider that reads like a field: label inside, value on the right, a visible handle. */
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
    <label
      className={cn(
        'relative flex h-8 items-center overflow-hidden rounded-[10px] bg-kumo-tint px-3 text-[12px]',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 bg-kumo-fill" style={{ width: `${pct}%` }} />
      <span
        aria-hidden
        className="absolute inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-kumo-contrast"
        style={{ left: `max(4px, min(calc(100% - 4px), ${pct}%))` }}
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
        aria-valuetext={format(value)}
        className="absolute inset-0 cursor-ew-resize opacity-0"
      />
    </label>
  )
}

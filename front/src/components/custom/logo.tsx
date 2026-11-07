import { cn } from '@/libs/utils'

const FAINT = [
  [0, 0],
  [17, 0],
  [0, 17],
  [34, 17],
  [17, 34],
  [34, 34],
]

export const LogoMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 47 47"
    aria-hidden="true"
    className={cn('size-[0.9em] shrink-0', className)}
  >
    {FAINT.map(([x, y]) => (
      <rect
        key={`${x}-${y}`}
        x={x}
        y={y}
        width="13"
        height="13"
        rx="3"
        fill="currentColor"
        opacity="0.18"
      />
    ))}
    <rect x="0" y="34" width="13" height="13" rx="3" fill="currentColor" />
    <rect x="17" y="17" width="13" height="13" rx="3" fill="currentColor" />
    <rect x="34" y="0" width="13" height="13" rx="3" className="fill-primary" />
  </svg>
)

export const Logo = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-[0.35em] tracking-tight',
      className,
    )}
  >
    <LogoMark />
    etepe<span className="text-primary">a</span>
  </span>
)

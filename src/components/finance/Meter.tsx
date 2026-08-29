import { cn } from '@/lib/utils';

export type MeterProps = {
  /** 0-100+. Values above 100 clamp the bar; state the overage in text. */
  percent: number | null;
  tone?: 'neutral' | 'warn' | 'danger' | 'income';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
};

const FILL = {
  neutral: 'bg-chart-neutral',
  warn: 'bg-warn',
  danger: 'bg-danger',
  income: 'bg-chart-income',
} as const;

/**
 * A ratio against a limit — a meter, not a chart.
 *
 * The unfilled track is a LIGHTER STEP OF THE SAME HUE rather than grey, so the
 * state reads across the whole bar even at low fill. The bar is clamped at 100%
 * and the overage is stated in text: a bar overflowing its track is a rendering
 * bug, not a data visualization.
 */
export function Meter({
  percent,
  tone = 'neutral',
  size = 'md',
  className,
  label,
}: MeterProps) {
  const clamped = percent === null ? 0 : Math.min(100, Math.max(0, percent));

  return (
    <div
      className={cn('w-full', className)}
      role="meter"
      aria-valuenow={percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          'w-full overflow-hidden rounded-full',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
          // Same hue, lighter step.
          tone === 'danger'
            ? 'bg-danger/20'
            : tone === 'warn'
              ? 'bg-warn/20'
              : tone === 'income'
                ? 'bg-chart-income/20'
                : 'bg-chart-neutral/20',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width]', FILL[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatPeso, type TCentavos } from '@/lib/money';

export type RankedBarItem = {
  id: string;
  label: string;
  /** The item's own colour — used ONLY for the identity dot beside the label. */
  color?: string | null;
  value: TCentavos;
};

export type RankedBarListProps = {
  items: RankedBarItem[];
  /** Rows shown before folding into "Other (n)". */
  visible?: number;
  onSelect?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
};

/**
 * Magnitude comparison across ~8-15 one-series categories.
 *
 * A horizontal ranked list, not a pie or donut: a donut with 12 slices is
 * unreadable, and part-to-whole "at a glance" caps out around 6 segments.
 *
 * EVERY bar is the same hue. Painting each bar its category colour would spend
 * the identity channel re-encoding what bar length already shows, and past ~7
 * hues adjacent classes blur under CVD regardless. Identity lives in the dot
 * beside the label, where it belongs — which also makes the category colours
 * genuinely useful, since they match the chips everywhere else.
 */
export function RankedBarList({
  items,
  visible = 8,
  onSelect,
  emptyMessage = 'Nothing to show yet.',
  className,
}: RankedBarListProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">{emptyMessage}</p>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);
  const shown = expanded ? items : items.slice(0, visible);
  const hidden = items.length - shown.length;
  const hiddenTotal = items.slice(visible).reduce((a, i) => a + i.value, 0);

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {shown.map((item) => {
        const pct = Math.max((item.value / max) * 100, 1.5);
        const Row = onSelect ? 'button' : 'div';
        return (
          <Row
            key={item.id}
            {...(onSelect
              ? { type: 'button' as const, onClick: () => onSelect(item.id) }
              : {})}
            className={cn(
              'group w-full text-left',
              onSelect &&
                'cursor-pointer rounded-md -mx-1 px-1 py-0.5 hover:bg-muted',
            )}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: item.color ?? 'var(--chart-neutral)' }}
                />
                <span className="truncate text-sm">{item.label}</span>
              </span>
              <span className="tnum shrink-0 text-sm font-semibold">
                {formatPeso(item.value)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-chart-neutral/15">
              <div
                className="h-full rounded-full bg-chart-neutral"
                style={{ width: `${pct}%` }}
              />
            </div>
          </Row>
        );
      })}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 flex items-baseline justify-between gap-3 rounded-md px-1 py-1 text-left text-sm text-text-muted hover:bg-muted"
        >
          <span>Other ({hidden})</span>
          <span className="tnum font-semibold">{formatPeso(hiddenTotal)}</span>
        </button>
      ) : null}

      {expanded && items.length > visible ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 self-start rounded-md px-1 text-xs text-text-muted hover:underline"
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}

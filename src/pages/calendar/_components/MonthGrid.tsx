import { weekdayLabels } from '@/lib/date';
import { Skeleton } from '@/components/ui/skeleton';
import type { TCalendarDay } from '../_types';
import { DayCell } from './DayCell';

export type MonthGridProps = {
  days: TCalendarDay[];
  selectedDate: string | null;
  compact: boolean;
  onSelect: (date: string) => void;
};

/**
 * 7 columns x 6 rows, always. The grid IS the navigation, so it is never
 * replaced by an empty state, and the row count never varies — a variable count
 * makes the page height jump between months.
 *
 * gap-px over a bordered container renders hairline separators rather than a
 * border on every cell.
 */
export function MonthGrid({
  days,
  selectedDate,
  compact,
  onSelect,
}: MonthGridProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-surface-2">
        {weekdayLabels().map((label) => (
          <div
            key={label}
            className="py-2 text-center text-2xs font-bold tracking-wide text-text-muted uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        role="grid"
        aria-label="Month"
        className="grid grid-cols-7 gap-px bg-border"
      >
        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isSelected={selectedDate === day.date}
            compact={compact}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/** Renders the real 7x6 shape so nothing shifts when data lands. */
export function MonthGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-surface-2">
        {weekdayLabels().map((label) => (
          <div
            key={label}
            className="py-2 text-center text-2xs font-bold tracking-wide text-text-muted uppercase"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {Array.from({ length: 42 }, (_, i) => (
          <div key={i} className="min-h-16 bg-card p-2 sm:min-h-20">
            <Skeleton className="h-3 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

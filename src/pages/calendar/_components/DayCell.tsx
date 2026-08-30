import {
  ArrowLeftRight,
  CalendarClock,
  CircleCheck,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPeso0 } from '@/lib/money';
import { partsOf } from '@/lib/date';
import type { TCalendarDay } from '../_types';

export type DayCellProps = {
  day: TCalendarDay;
  isSelected: boolean;
  /** Below ~380px, amounts are replaced with dots. */
  compact: boolean;
  onSelect: (date: string) => void;
};

/**
 * One cell of the month grid.
 *
 * State layers, in PRIORITY ORDER — a cell can be several at once:
 *  1. overdue unpaid due  -> danger ring + tint. The loudest thing on screen.
 *  2. due today/future    -> clock icon, warn
 *  3. paid due            -> check icon, muted
 *  4. today               -> primary ring, dropping to ring-1 when overdue also
 *                            applies, so OVERDUE ALWAYS WINS visually
 *  5. selected            -> accent background
 *
 * Amounts always carry an explicit + / − prefix: colour is never the only
 * channel, which is what makes this readable under deuteranopia.
 *
 * `data-*` attributes exist so tests can assert on state rather than on class
 * strings, which would break on any restyle.
 */
export function DayCell({ day, isSelected, compact, onSelect }: DayCellProps) {
  const { day: dayNumber } = partsOf(day.date);

  const hasOverdue = day.hasOverdueInstallment;
  const unpaidUpcoming = day.dues.some(
    (d) => d.derivedStatus === 'dueSoon' || d.derivedStatus === 'pending',
  );
  const paidDue = day.dues.some((d) => d.derivedStatus === 'paid');

  // Scheduled recurring money that has NOT happened yet. Rendered faint and
  // never summed into the day's figures — a forecast must not read as a fact.
  const projectedIncome = day.projections
    .filter((p) => p.type === 'income')
    .reduce((a, p) => a + p.amountCentavos, 0);
  const projectedExpense = day.projections
    .filter((p) => p.type === 'expense')
    .reduce((a, p) => a + p.amountCentavos, 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      data-date={day.date}
      data-in-month={day.inMonth}
      data-today={day.isToday || undefined}
      data-overdue={hasOverdue || undefined}
      data-selected={isSelected || undefined}
      aria-current={day.isToday ? 'date' : undefined}
      aria-label={`${day.date}${hasOverdue ? ', has an overdue installment' : ''}`}
      className={cn(
        'relative flex min-h-16 flex-col items-stretch gap-0.5 bg-card p-1.5 text-left transition-colors sm:min-h-20 sm:p-2',
        'hover:bg-muted focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        !day.inMonth && 'opacity-55',
        isSelected && 'bg-accent hover:bg-accent',
        // Overdue: the whole cell shouts.
        hasOverdue &&
          'bg-danger-tint ring-2 ring-danger ring-inset hover:bg-danger-tint',
        // Today ring — thinner when overdue already owns the ring.
        day.isToday &&
          (hasOverdue
            ? 'ring-1 ring-danger ring-inset'
            : 'ring-2 ring-primary ring-inset'),
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'text-xs font-bold tabular-nums',
            day.isToday && !hasOverdue && 'text-primary',
            hasOverdue && 'text-danger',
          )}
        >
          {dayNumber}
        </span>

        <span className="flex items-center gap-0.5">
          {day.hasProjectedRecurring ? (
            <Repeat className="size-3 text-text-faint" aria-hidden />
          ) : null}
          {hasOverdue ? null : unpaidUpcoming ? (
            <CalendarClock className="size-3 text-warn" aria-hidden />
          ) : paidDue ? (
            <CircleCheck className="size-3 text-text-faint" aria-hidden />
          ) : null}
        </span>
      </span>

      {compact ? (
        <span className="mt-auto flex items-center gap-1">
          {day.incomeCentavos > 0 ? (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-chart-income"
            />
          ) : null}
          {day.expenseCentavos > 0 ? (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-chart-expense"
            />
          ) : null}
          {day.transferCentavos > 0 ? (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-chart-neutral"
            />
          ) : null}
          {day.projections.length > 0 ? (
            <span
              aria-hidden
              className="size-1.5 rounded-full border border-text-faint"
            />
          ) : null}
        </span>
      ) : (
        <span className="mt-auto flex flex-col leading-tight">
          {day.incomeCentavos > 0 ? (
            <span className="tnum text-2xs font-semibold text-ink-income">
              +{formatPeso0(day.incomeCentavos)}
            </span>
          ) : null}
          {day.expenseCentavos > 0 ? (
            <span className="tnum text-2xs font-semibold text-ink-expense">
              −{formatPeso0(day.expenseCentavos)}
            </span>
          ) : null}
          {/* Neither sign: a transfer moves money without changing the total,
              so a + or − here would be a lie. */}
          {day.transferCentavos > 0 ? (
            <span className="tnum text-2xs flex items-center gap-0.5 font-semibold text-text-muted">
              <ArrowLeftRight className="size-2.5" aria-hidden />
              {formatPeso0(day.transferCentavos)}
            </span>
          ) : null}
          {/* Faint and italic: scheduled, not recorded. */}
          {projectedIncome > 0 ? (
            <span className="tnum text-2xs text-text-faint italic">
              +{formatPeso0(projectedIncome)}
            </span>
          ) : null}
          {projectedExpense > 0 ? (
            <span className="tnum text-2xs text-text-faint italic">
              −{formatPeso0(projectedExpense)}
            </span>
          ) : null}
        </span>
      )}
    </button>
  );
}

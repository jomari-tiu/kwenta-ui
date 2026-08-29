import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { formatDisplayDate } from '@/lib/date';
import { formatPeso } from '@/lib/money';
import { generateSchedule, scheduleWasClamped } from '../_schedule';

export type SchedulePreviewProps = {
  totalCentavos: number | null;
  termMonths: number;
  startDate: string;
  dayOfMonth: number;
};

/**
 * The user-visible contract of the schedule algorithm.
 *
 * The footer total MUST equal the input total — if it ever doesn't, the split is
 * broken and the user would be committing to a payment plan they didn't intend.
 */
export function SchedulePreview({
  totalCentavos,
  termMonths,
  startDate,
  dayOfMonth,
}: SchedulePreviewProps) {
  const schedule = useMemo(() => {
    const valid =
      totalCentavos !== null &&
      totalCentavos > 0 &&
      Number.isInteger(termMonths) &&
      termMonths >= 1 &&
      termMonths <= 120 &&
      totalCentavos >= termMonths &&
      Number.isInteger(dayOfMonth) &&
      dayOfMonth >= 1 &&
      dayOfMonth <= 31 &&
      /^\d{4}-\d{2}-\d{2}$/.test(startDate);

    if (!valid) return null;
    return generateSchedule({
      totalCentavos,
      termMonths,
      startDate,
      dayOfMonth,
    });
  }, [totalCentavos, termMonths, startDate, dayOfMonth]);

  if (!schedule) {
    return (
      <div className="grid min-h-48 place-items-center rounded-lg border border-dashed p-4">
        <p className="max-w-56 text-center text-sm text-text-muted">
          Enter a total, a number of months and a due day to preview the
          schedule.
        </p>
      </div>
    );
  }

  const sum = schedule.reduce((a, p) => a + p.amountCentavos, 0);
  const clamped = scheduleWasClamped(schedule, dayOfMonth);

  return (
    <div className="flex flex-col rounded-lg border">
      <div className="flex items-baseline justify-between gap-2 border-b bg-surface-2 px-3 py-2">
        <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
          Schedule
        </span>
        <span className="text-xs text-text-muted">
          {schedule.length} payments
        </span>
      </div>

      <ul
        className="max-h-72 divide-y overflow-y-auto"
        data-testid="schedule-rows"
      >
        {schedule.map((p) => (
          <li
            key={p.sequenceNo}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <span className="tabular-nums text-text-muted">{p.sequenceNo}</span>
            <span className="flex-1 truncate">
              {formatDisplayDate(p.dueDate)}
            </span>
            <span className="tnum font-semibold">
              {formatPeso(p.amountCentavos)}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="flex items-baseline justify-between gap-2 border-t bg-surface-2 px-3 py-2.5"
        data-testid="schedule-total"
      >
        <span className="text-sm font-bold">Total</span>
        <span className="tnum text-sm font-bold">{formatPeso(sum)}</span>
      </div>

      {clamped ? (
        <p className="flex items-start gap-1.5 border-t px-3 py-2 text-xs text-text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Some months are shorter, so those payments fall on the last day of the
          month.
        </p>
      ) : null}
    </div>
  );
}

import {
  addMonthsToKey,
  monthKeyOf,
  partsOf,
  plainDateForDayOfMonth,
} from '@/lib/date';
import type { TCentavos } from '@/lib/money';
import type { TScheduledPayment } from './_types';

/**
 * The client-side installment schedule generator.
 *
 * This MIRRORS the API's installments.split.ts. Two implementations of one
 * algorithm in two languages will drift, so the algorithm is specified once in
 * docs/conventions.md, this file's test is its executable spec (mirrored
 * case-for-case by the API's test), and the create flow compares the returned
 * plan against what was previewed and warns on mismatch.
 *
 * Two invariants:
 *
 * 1. sum(amountCentavos) === totalCentavos, EXACTLY, for every input. The
 *    remainder lands on the LAST payment, matching how PH lenders amortize.
 *
 * 2. Due dates are generated INDEPENDENTLY from (startMonth + i), never by
 *    iterating from the previous date. date-fns addMonths(Jan 31, 1) is Feb 28,
 *    and stepping again from THAT gives Mar 28 — the day-of-month silently
 *    drifts for the rest of the plan. Generating from the anchor means day 31
 *    clamps to Feb 28 and then RETURNS to Mar 31.
 */
export function splitCentavos(
  totalCentavos: TCentavos,
  parts: number,
): TCentavos[] {
  if (!Number.isInteger(totalCentavos) || totalCentavos <= 0) {
    throw new Error('splitCentavos: total must be a positive integer');
  }
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error('splitCentavos: parts must be a positive integer');
  }
  if (totalCentavos < parts) {
    throw new Error('splitCentavos: total must be at least 1 centavo per part');
  }

  const base = Math.floor(totalCentavos / parts);
  const out = Array.from({ length: parts }, () => base);
  out[parts - 1] = totalCentavos - base * (parts - 1);
  return out;
}

export type TGenerateScheduleArgs = {
  totalCentavos: TCentavos;
  termMonths: number;
  startDate: string;
  dayOfMonth: number;
};

export function generateSchedule({
  totalCentavos,
  termMonths,
  startDate,
  dayOfMonth,
}: TGenerateScheduleArgs): TScheduledPayment[] {
  const amounts = splitCentavos(totalCentavos, termMonths);
  const startKey = monthKeyOf(startDate);

  return amounts.map((amountCentavos, i) => {
    const key = addMonthsToKey(startKey, i);
    const { year, month } = partsOf(`${key}-01`);
    return {
      sequenceNo: i + 1,
      // Clamped per month, from the ORIGINAL dayOfMonth every time.
      dueDate: plainDateForDayOfMonth(year, month, dayOfMonth),
      amountCentavos,
    };
  });
}

/** True when any due date had to be pulled back to the month's last day. */
export function scheduleWasClamped(
  schedule: TScheduledPayment[],
  dayOfMonth: number,
): boolean {
  return schedule.some((p) => partsOf(p.dueDate).day !== dayOfMonth);
}

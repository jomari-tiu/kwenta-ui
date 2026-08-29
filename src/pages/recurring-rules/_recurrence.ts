import { formatDisplayDate, ordinal } from '@/lib/date';
import type { TRecurringRule } from './_types';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * A human-readable summary of a rule.
 *
 * For days 29-31 it says "last day of the month" rather than promising the 31st,
 * because that is what actually happens — the schedule clamps to the month's
 * last day.
 */
export function describeRule(
  rule: Pick<
    TRecurringRule,
    | 'frequency'
    | 'interval'
    | 'dayOfWeek'
    | 'dayOfMonth'
    | 'monthOfYear'
    | 'startDate'
    | 'endDate'
    | 'isActive'
  >,
): string {
  let base: string;

  switch (rule.frequency) {
    case 'weekly': {
      const day = WEEKDAYS[(rule.dayOfWeek ?? 1) - 1] ?? 'Monday';
      base =
        rule.interval > 1
          ? `Every ${ordinal(rule.interval)} week on ${day}`
          : `Every ${day}`;
      break;
    }
    case 'biweekly': {
      const day = WEEKDAYS[(rule.dayOfWeek ?? 1) - 1] ?? 'Monday';
      base = `Every other ${day}, from ${formatDisplayDate(rule.startDate)}`;
      break;
    }
    case 'monthly': {
      const dom = rule.dayOfMonth ?? 1;
      const which = dom >= 29 ? 'last day' : `${ordinal(dom)}`;
      base =
        rule.interval > 1
          ? `Every ${rule.interval} months on the ${which}`
          : `Every ${which} of the month`;
      break;
    }
    case 'yearly': {
      const month = MONTHS[(rule.monthOfYear ?? 1) - 1] ?? 'January';
      const dom = rule.dayOfMonth ?? 1;
      base = `Every ${month} ${dom >= 29 ? `${dom} (or the last day)` : dom}`;
      break;
    }
  }

  const parts = [base];
  if (rule.endDate) parts.push(`until ${formatDisplayDate(rule.endDate)}`);
  if (!rule.isActive) parts.push('paused');
  return parts.join(' · ');
}

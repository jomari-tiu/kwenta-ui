import {
  addMonths as fnsAddMonths,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getDaysInMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/**
 * A calendar date with no time and no zone. Always 'YYYY-MM-DD'.
 *
 * THE RULE: a plain date is a string from the API to the pixel. It becomes a
 * Date only to feed a date picker, and comes back only through toPlainDate().
 *
 * At UTC+8, `new Date(2026, 7, 22).toISOString().slice(0,10)` is "2026-08-21" —
 * local midnight Aug 22 is 16:00 UTC Aug 21. Every "saved on the 22nd, shows
 * the 21st" bug is that line. ESLint bans toISOString, toLocaleDateString and
 * single-arg `new Date()` everywhere except this file.
 */
export type TPlainDate = string;
/** 'YYYY-MM' */
export type TMonthKey = string;

/** Monday. Pass to EVERY date-fns week call. */
export const WEEK_STARTS_ON = 1 as const;

/**
 * date-fns pattern for "MMM D, YYYY".
 *
 * NOT 'MMM D, YYYY' — that is Moment syntax. In date-fns `D` is day-of-YEAR
 * (so late August renders "Aug 234, 2026") and `YYYY` is ISO week-year (which
 * date-fns v4 throws on). One exported constant kills the whole class.
 */
export const DATE_FORMAT = 'MMM d, yyyy';
export const DATE_FORMAT_SHORT = 'MMM d';
export const MONTH_FORMAT = 'MMMM yyyy';

/** Today, in the browser's local zone, as a plain date. */
export function todayPlainDate(): TPlainDate {
  return format(new Date(), 'yyyy-MM-dd');
}

/** A local Date -> plain date. Uses LOCAL fields, never UTC. */
export function toPlainDate(d: Date): TPlainDate {
  return format(d, 'yyyy-MM-dd');
}

/** Plain date -> local midnight Date. For date pickers only. */
export function parsePlainDate(s: TPlainDate): Date {
  return parse(s, 'yyyy-MM-dd', new Date());
}

export function formatDisplayDate(s: TPlainDate): string {
  return format(parsePlainDate(s), DATE_FORMAT);
}

export function formatDisplayDateShort(s: TPlainDate): string {
  return format(parsePlainDate(s), DATE_FORMAT_SHORT);
}

export function formatWeekday(s: TPlainDate): string {
  return format(parsePlainDate(s), 'EEEE');
}

/**
 * Chronological comparison.
 *
 * Lexicographic comparison on zero-padded ISO strings IS chronological, so this
 * needs no parsing and no timezone. That is why keeping dates as strings is a
 * correctness feature rather than just an optimisation — overdue detection is a
 * string compare.
 */
export function isBefore(a: TPlainDate, b: TPlainDate): boolean {
  return a < b;
}

export function isAfter(a: TPlainDate, b: TPlainDate): boolean {
  return a > b;
}

/** Pure string slice. No date math. */
export function monthKeyOf(s: TPlainDate): TMonthKey {
  return s.slice(0, 7);
}

export function currentMonthKey(): TMonthKey {
  return monthKeyOf(todayPlainDate());
}

export function addMonthsToKey(k: TMonthKey, n: number): TMonthKey {
  const anchor = parsePlainDate(`${k}-01`);
  return format(fnsAddMonths(anchor, n), 'yyyy-MM');
}

export function formatMonthKey(k: TMonthKey): string {
  return format(parsePlainDate(`${k}-01`), MONTH_FORMAT);
}

export function yearOfKey(k: TMonthKey): number {
  return Number(k.slice(0, 4));
}

/**
 * The 42 cells of a month grid, Monday-first, as plain-date STRINGS.
 *
 * Always 6 rows. A variable row count makes the page height jump between months
 * and forces the day panel to reflow. Returning strings means the render path
 * does a direct map lookup with zero date conversion — the structural fix for
 * the off-by-one bug rather than a mitigation.
 */
export function buildMonthGrid(k: TMonthKey): TPlainDate[] {
  const monthStart = startOfMonth(parsePlainDate(`${k}-01`));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(addWeeks(gridStart, 5), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map(toPlainDate);
}

export function isSameMonth(s: TPlainDate, k: TMonthKey): boolean {
  return monthKeyOf(s) === k;
}

/** ['Mon', ..., 'Sun'] */
export function weekdayLabels(): string[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDaysLocal(monday, i), 'EEEEEE'),
  );
}

function addDaysLocal(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addDays(s: TPlainDate, n: number): TPlainDate {
  return toPlainDate(addDaysLocal(parsePlainDate(s), n));
}

/**
 * A plain date for the given day-of-month, clamped to the month's last day.
 *
 * Clamping must NOT move the anchor: day 31 gives Feb 28 and then returns to
 * Mar 31. Callers pass the ORIGINAL dayOfMonth every time, never the clamped
 * result of the previous month — iterating would drift to Mar 28 and stay
 * wrong for the rest of the plan.
 */
export function plainDateForDayOfMonth(
  year: number,
  month: number,
  dayOfMonth: number,
): TPlainDate {
  const monthAnchor = new Date(year, month - 1, 1);
  const clamped = Math.min(dayOfMonth, getDaysInMonth(monthAnchor));
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

export function partsOf(s: TPlainDate): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: Number(s.slice(0, 4)),
    month: Number(s.slice(5, 7)),
    day: Number(s.slice(8, 10)),
  };
}

export function firstDayOfMonth(k: TMonthKey): TPlainDate {
  return `${k}-01`;
}

export function lastDayOfMonth(k: TMonthKey): TPlainDate {
  const { year, month } = partsOf(`${k}-01`);
  return plainDateForDayOfMonth(year, month, 31);
}

/** ISO day of week: Monday = 1 ... Sunday = 7. Never Postgres `dow`. */
export function isoDayOfWeek(s: TPlainDate): number {
  const dow = parsePlainDate(s).getDay();
  return dow === 0 ? 7 : dow;
}

export function mondayOf(s: TPlainDate): TPlainDate {
  return toPlainDate(
    startOfWeek(parsePlainDate(s), { weekStartsOn: WEEK_STARTS_ON }),
  );
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 21 -> "21st". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

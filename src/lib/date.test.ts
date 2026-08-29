import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonthsToKey,
  buildMonthGrid,
  formatDisplayDate,
  isBefore,
  isoDayOfWeek,
  mondayOf,
  monthKeyOf,
  ordinal,
  parsePlainDate,
  plainDateForDayOfMonth,
  toPlainDate,
  WEEK_STARTS_ON,
} from './date';

/**
 * This suite is run under four timezones by `npm run test:tz`, because a
 * timezone bug is invisible in the timezone you wrote it in. UTC and
 * America/New_York (negative offset, has DST) break the write path;
 * Pacific/Kiritimati (UTC+14) breaks the read path.
 */
// Intl reports the zone vitest is running under without needing node types.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe(`date helpers [TZ=${TZ}]`, () => {
  it('toPlainDate uses LOCAL fields, so the day never shifts', () => {
    // The canonical bug: new Date(2026, 7, 22).toISOString() is 2026-08-21 at
    // UTC+8.
    expect(toPlainDate(new Date(2026, 7, 22))).toBe('2026-08-22');
    expect(toPlainDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toPlainDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parsePlainDate yields local midnight on the same calendar day', () => {
    const d = parsePlainDate('2026-08-22');
    expect(d.getDate()).toBe(22);
    expect(d.getMonth()).toBe(7);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips string -> Date -> string unchanged', () => {
    for (const s of [
      '2026-01-01',
      '2026-02-28',
      '2026-06-15',
      '2026-08-22',
      '2026-12-31',
      '2028-02-29',
    ]) {
      expect(toPlainDate(parsePlainDate(s))).toBe(s);
    }
  });

  it('survives a US DST transition unchanged', () => {
    // 2026-03-08 is the US spring-forward date. Under America/New_York a naive
    // implementation lands on the 7th.
    expect(toPlainDate(parsePlainDate('2026-03-08'))).toBe('2026-03-08');
    expect(toPlainDate(parsePlainDate('2026-11-01'))).toBe('2026-11-01');
  });

  it('isBefore is a plain lexicographic compare', () => {
    expect(isBefore('2026-08-09', '2026-08-10')).toBe(true);
    expect(isBefore('2026-08-10', '2026-08-09')).toBe(false);
    expect(isBefore('2026-08-22', '2026-08-22')).toBe(false);
    // Zero-padding sanity: string compare must not put 9 after 10.
    expect(isBefore('2026-09-01', '2026-10-01')).toBe(true);
  });

  it('monthKeyOf is a pure slice', () => {
    expect(monthKeyOf('2026-08-22')).toBe('2026-08');
  });

  it('addMonthsToKey crosses year boundaries', () => {
    expect(addMonthsToKey('2026-08', 1)).toBe('2026-09');
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01');
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12');
    expect(addMonthsToKey('2026-08', 12)).toBe('2027-08');
  });
});

describe(`buildMonthGrid [TZ=${TZ}]`, () => {
  it('always returns 42 cells starting on a Monday', () => {
    for (const k of ['2026-01', '2026-02', '2026-08', '2028-02', '2027-03']) {
      const grid = buildMonthGrid(k);
      expect(grid, k).toHaveLength(42);
      expect(isoDayOfWeek(grid[0]), `${k} first cell weekday`).toBe(
        WEEK_STARTS_ON,
      );
    }
  });

  it('matches the known August 2026 window', () => {
    const grid = buildMonthGrid('2026-08');
    expect(grid[0]).toBe('2026-07-27');
    expect(grid[41]).toBe('2026-09-06');
  });

  it('still returns 42 cells when the month starts ON a Monday', () => {
    // 2026-06-01 is a Monday.
    const grid = buildMonthGrid('2026-06');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-06-01');
  });

  it('handles a leap February', () => {
    const grid = buildMonthGrid('2028-02');
    expect(grid).toHaveLength(42);
    expect(grid).toContain('2028-02-29');
  });

  it('has no gaps or repeats', () => {
    const grid = buildMonthGrid('2026-08');
    expect(new Set(grid).size).toBe(42);
    for (let i = 1; i < grid.length; i += 1) {
      expect(addDays(grid[i - 1], 1)).toBe(grid[i]);
    }
  });
});

describe(`plainDateForDayOfMonth [TZ=${TZ}]`, () => {
  it('clamps to the last day of a short month', () => {
    expect(plainDateForDayOfMonth(2026, 2, 31)).toBe('2026-02-28');
    expect(plainDateForDayOfMonth(2028, 2, 31)).toBe('2028-02-29');
    expect(plainDateForDayOfMonth(2026, 4, 31)).toBe('2026-04-30');
    expect(plainDateForDayOfMonth(2026, 2, 29)).toBe('2026-02-28');
    expect(plainDateForDayOfMonth(2028, 2, 29)).toBe('2028-02-29');
  });

  it('does not clamp when the day exists', () => {
    expect(plainDateForDayOfMonth(2026, 1, 31)).toBe('2026-01-31');
    expect(plainDateForDayOfMonth(2026, 8, 15)).toBe('2026-08-15');
  });

  it('does NOT drift: day 31 returns to 31 after a short month', () => {
    const dates = [1, 2, 3, 4].map((m) => plainDateForDayOfMonth(2026, m, 31));
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});

describe(`weekday helpers [TZ=${TZ}]`, () => {
  it('isoDayOfWeek maps Monday to 1 and Sunday to 7', () => {
    expect(isoDayOfWeek('2026-08-17')).toBe(1); // Monday
    expect(isoDayOfWeek('2026-08-23')).toBe(7); // Sunday
  });

  it('mondayOf works when given a SUNDAY — the classic off-by-one', () => {
    expect(mondayOf('2026-08-23')).toBe('2026-08-17');
    expect(mondayOf('2026-08-17')).toBe('2026-08-17');
    expect(mondayOf('2026-08-22')).toBe('2026-08-17');
  });
});

describe(`formatDisplayDate [TZ=${TZ}]`, () => {
  it('renders MMM d, yyyy — not day-of-year', () => {
    // 'MMM D, YYYY' (Moment syntax) would render "Aug 234, 2026" here.
    expect(formatDisplayDate('2026-08-22')).toBe('Aug 22, 2026');
    expect(formatDisplayDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDisplayDate('2026-12-31')).toBe('Dec 31, 2026');
  });
});

describe('ordinal', () => {
  it('handles the teens and the 1/2/3 suffixes', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '31st',
      '111th',
    ]);
  });
});

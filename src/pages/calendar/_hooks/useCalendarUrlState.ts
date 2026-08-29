import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { addMonthsToKey, currentMonthKey, monthKeyOf } from '@/lib/date';

/**
 * Calendar state lives in the URL: /calendar?m=2026-08&d=2026-08-22
 *
 * This is not decoration:
 *  - `d` makes the day panel BACK-BUTTON DISMISSABLE. On a phone the gesture
 *    back must close the sheet, not exit to the dashboard.
 *  - Refresh and deep links land you back where you were, which matters when
 *    you're logging an expense at a checkout counter and Safari reloads the tab.
 *
 * Month navigation uses replace so scrubbing through a year doesn't leave 12
 * history entries; opening/closing a day pushes so back works.
 *
 * Nothing else in the calendar touches useSearchParams.
 */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function useCalendarUrlState() {
  const [params, setParams] = useSearchParams();

  const rawMonth = params.get('m');
  const monthKey =
    rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : currentMonthKey();

  const rawDay = params.get('d');
  const selectedDate = rawDay && DATE_RE.test(rawDay) ? rawDay : null;

  const goToMonth = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params);
      next.set('m', key);
      next.delete('d');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const stepMonth = useCallback(
    (delta: number) => goToMonth(addMonthsToKey(monthKey, delta)),
    [goToMonth, monthKey],
  );

  const goToToday = useCallback(() => {
    goToMonth(currentMonthKey());
  }, [goToMonth]);

  const openDay = useCallback(
    (date: string) => {
      const next = new URLSearchParams(params);
      // Tapping a trailing/leading cell jumps to that month too, mirroring
      // every native calendar.
      next.set('m', monthKeyOf(date));
      next.set('d', date);
      setParams(next, { replace: false });
    },
    [params, setParams],
  );

  const closeDay = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('d');
    setParams(next, { replace: false });
  }, [params, setParams]);

  return {
    monthKey,
    selectedDate,
    goToMonth,
    stepMonth,
    goToToday,
    openDay,
    closeDay,
  };
}

import { keepPreviousData } from '@tanstack/react-query';
import { useGet } from '@/lib/api';
import { CALENDAR_KEY } from '@/lib/queryKeys';
import type { TCalendarMonth } from '../_types';

/**
 * QUERIES ONLY.
 *
 * The calendar is a read model, not an entity, so it deliberately breaks the
 * canonical module shape. Every money-moving mutation lives in the module that
 * owns the entity: the day panel imports its transaction mutations from
 * pages/transactions/_hooks/api and its pay/unpay from
 * pages/installments/_hooks/api. Defining copies here would mean two
 * invalidation lists, and the day someone updates one and not the other is the
 * day the dashboard goes quietly stale.
 */
export function useCalendarMonth(monthKey: string) {
  return useGet<TCalendarMonth>({
    url: '/api/v1/calendar',
    key: [CALENDAR_KEY, monthKey],
    params: { month: monthKey },
    // The month payload carries FULL rows per day, so the day panel reads from
    // this cache entry — there is no separate day fetch and therefore no way
    // for the grid and the panel to disagree.
    placeholderData: keepPreviousData,
  });
}

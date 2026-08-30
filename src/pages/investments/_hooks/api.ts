import { useGet, useMutate } from '@/lib/api';
import {
  CALENDAR_KEY,
  DASHBOARD_KEY,
  LEDGER_KEYS,
  toKeyPart,
} from '@/lib/queryKeys';
import type {
  TInvestment,
  TInvestmentDetail,
  TInvestmentPayload,
  TInvestmentSummary,
} from '../_types';

export const INVESTMENTS_KEY = 'investments';

export function useInvestments(status: 'active' | 'closed' | 'all') {
  return useGet<TInvestment[]>({
    isList: true,
    url: '/api/v1/investments',
    key: [INVESTMENTS_KEY, 'list', toKeyPart(status)],
    params: { status, pageNumber: 1, pageSize: 100 },
    staleTime: 60_000,
  });
}

export function useInvestmentSummary() {
  return useGet<TInvestmentSummary>({
    url: '/api/v1/investments/summary',
    key: [INVESTMENTS_KEY, 'summary'],
    staleTime: 60_000,
  });
}

export function useInvestment(id: string) {
  return useGet<TInvestmentDetail>({
    url: `/api/v1/investments/${id}`,
    key: [INVESTMENTS_KEY, toKeyPart(id)],
    enabled: Boolean(id),
  });
}

/**
 * Creating or editing a fund moves no money — it only changes the goal, the
 * goal date, or a hand-entered valuation. So this refreshes the fund list, the
 * calendar (its goal-date marker) and the dashboard, but NOT budgets or account
 * balances.
 */
const FUND_INVALIDATIONS = [[INVESTMENTS_KEY], [CALENDAR_KEY], [DASHBOARD_KEY]];

export function useCreateInvestment() {
  return useMutate<TInvestmentPayload, TInvestment>({
    url: '/api/v1/investments',
    method: 'post',
    invalidateKeys: FUND_INVALIDATIONS,
  });
}

export function useUpdateInvestment(id: string) {
  return useMutate<Partial<TInvestmentPayload>, TInvestment>({
    url: `/api/v1/investments/${id}`,
    method: 'patch',
    invalidateKeys: FUND_INVALIDATIONS,
  });
}

/**
 * Deleting a fund leaves its contributions and withdrawals in the ledger, so
 * this is a ledger event: balances and the transactions list must re-read.
 */
export function useDeleteInvestment(id: string) {
  return useMutate<void, { keptTransactionCount: number }>({
    url: `/api/v1/investments/${id}`,
    method: 'delete',
    invalidateKeys: [...LEDGER_KEYS, [INVESTMENTS_KEY]],
  });
}

/** A contribution creates a real expense — full ledger blast radius. */
export function useContribute(id: string) {
  return useMutate<
    { amountCentavos: number; paidDate?: string; note?: string | null },
    { transactionId: string }
  >({
    url: `/api/v1/investments/${id}/contribute`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [INVESTMENTS_KEY]],
  });
}

/** A withdrawal creates a real income — same blast radius, opposite sign. */
export function useWithdraw(id: string) {
  return useMutate<
    {
      amountCentavos: number;
      categoryId: string;
      paidDate?: string;
      note?: string | null;
    },
    { transactionId: string }
  >({
    url: `/api/v1/investments/${id}/withdraw`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [INVESTMENTS_KEY]],
  });
}

/**
 * Undo a contribution or withdrawal, from the module that owns it. The fund's
 * balance is derived from these rows, so removing one simply moves it back.
 */
export function useDeleteFlow(investmentId: string) {
  return useMutate<{ transactionId: string }, unknown>({
    url: (v) => `/api/v1/investments/${investmentId}/flows/${v.transactionId}`,
    method: 'delete',
    invalidateKeys: [...LEDGER_KEYS, [INVESTMENTS_KEY]],
  });
}

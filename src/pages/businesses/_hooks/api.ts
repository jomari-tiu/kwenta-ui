import { useGet, useMutate } from '@/lib/api';
import {
  CALENDAR_KEY,
  DASHBOARD_KEY,
  LEDGER_KEYS,
  toKeyPart,
} from '@/lib/queryKeys';
import type {
  TBusiness,
  TBusinessEntry,
  TBusinessesSummary,
  TBusinessPayload,
} from '../_types';

export const BUSINESSES_KEY = 'businesses';

export function useBusinesses(status: 'active' | 'closed' | 'all') {
  return useGet<TBusiness[]>({
    isList: true,
    url: '/api/v1/businesses',
    key: [BUSINESSES_KEY, 'list', toKeyPart(status)],
    params: { status, pageNumber: 1, pageSize: 100 },
    staleTime: 60_000,
  });
}

export function useBusinessesSummary() {
  return useGet<TBusinessesSummary>({
    url: '/api/v1/businesses/summary',
    key: [BUSINESSES_KEY, 'summary'],
    staleTime: 60_000,
  });
}

export function useBusinessEntries(id: string) {
  return useGet<TBusinessEntry[]>({
    url: `/api/v1/businesses/${id}/entries`,
    key: [BUSINESSES_KEY, toKeyPart(id), 'entries'],
    enabled: Boolean(id),
  });
}

/**
 * Creating or renaming a business moves no money, so this refreshes the list
 * and the two screens that show a business figure — not budgets or balances.
 */
const RECORD_INVALIDATIONS = [
  [BUSINESSES_KEY],
  [CALENDAR_KEY],
  [DASHBOARD_KEY],
];

export function useCreateBusiness() {
  return useMutate<TBusinessPayload, TBusiness>({
    url: '/api/v1/businesses',
    method: 'post',
    invalidateKeys: RECORD_INVALIDATIONS,
  });
}

export function useUpdateBusiness(id: string) {
  return useMutate<Partial<TBusinessPayload>, TBusiness>({
    url: `/api/v1/businesses/${id}`,
    method: 'patch',
    invalidateKeys: RECORD_INVALIDATIONS,
  });
}

/**
 * Deleting a business leaves its entries in the ledger with the tag cleared, so
 * this IS a ledger event — the transactions list and every total must re-read.
 */
export function useDeleteBusiness(id: string) {
  return useMutate<void, { keptTransactionCount: number }>({
    url: `/api/v1/businesses/${id}`,
    method: 'delete',
    invalidateKeys: [...LEDGER_KEYS, [BUSINESSES_KEY]],
  });
}

type TEntryBody = {
  kind: 'revenue' | 'cost';
  amountCentavos: number;
  categoryId: string;
  /** Sent only when the business has no account of its own. */
  accountId?: string;
  txnDate?: string;
  note?: string | null;
};

/** Revenue or a cost writes a real income/expense — full ledger blast radius. */
export function useAddEntry(id: string) {
  return useMutate<TEntryBody, TBusiness>({
    url: `/api/v1/businesses/${id}/entries`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [BUSINESSES_KEY]],
  });
}

/** Capital writes a transfer: two account balances move, no total changes. */
export function useAddCapital(id: string) {
  return useMutate<
    {
      amountCentavos: number;
      fromAccountId: string;
      txnDate?: string;
      note?: string | null;
    },
    TBusiness
  >({
    url: `/api/v1/businesses/${id}/capital`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [BUSINESSES_KEY]],
  });
}

/** The same transfer, reversed. */
export function useAddDrawing(id: string) {
  return useMutate<
    {
      amountCentavos: number;
      toAccountId: string;
      txnDate?: string;
      note?: string | null;
    },
    TBusiness
  >({
    url: `/api/v1/businesses/${id}/drawing`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [BUSINESSES_KEY]],
  });
}

/** Undo an entry, from the module that owns it. */
export function useDeleteEntry(businessId: string) {
  return useMutate<{ transactionId: string }, TBusiness>({
    url: (v) => `/api/v1/businesses/${businessId}/entries/${v.transactionId}`,
    method: 'delete',
    invalidateKeys: [...LEDGER_KEYS, [BUSINESSES_KEY]],
  });
}

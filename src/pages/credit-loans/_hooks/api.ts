import { useGet, useMutate } from '@/lib/api';
import {
  CALENDAR_KEY,
  DASHBOARD_KEY,
  LEDGER_KEYS,
  toKeyPart,
} from '@/lib/queryKeys';
import type {
  TCreditLoan,
  TCreditLoanDetail,
  TCreditLoanPayload,
  TCreditLoanSummary,
} from '../_types';

export const CREDIT_LOANS_KEY = 'credit-loans';

export function useCreditLoans(status: 'open' | 'settled' | 'all') {
  return useGet<TCreditLoan[]>({
    isList: true,
    url: '/api/v1/credit-loans',
    key: [CREDIT_LOANS_KEY, 'list', toKeyPart(status)],
    params: { status, pageNumber: 1, pageSize: 100 },
    staleTime: 60_000,
  });
}

export function useCreditLoanSummary() {
  return useGet<TCreditLoanSummary>({
    url: '/api/v1/credit-loans/summary',
    key: [CREDIT_LOANS_KEY, 'summary'],
    staleTime: 60_000,
  });
}

export function useCreditLoan(id: string) {
  return useGet<TCreditLoanDetail>({
    url: `/api/v1/credit-loans/${id}`,
    key: [CREDIT_LOANS_KEY, toKeyPart(id)],
    enabled: Boolean(id),
  });
}

/**
 * Creating or editing a loan moves no money — it only changes what is owed and
 * when. So this refreshes the loan list, the calendar (its due-date marker and
 * overdue red) and the dashboard, but NOT budgets or account balances.
 */
const LOAN_INVALIDATIONS = [
  [CREDIT_LOANS_KEY],
  [CALENDAR_KEY],
  [DASHBOARD_KEY],
];

export function useCreateCreditLoan() {
  return useMutate<TCreditLoanPayload, TCreditLoan>({
    url: '/api/v1/credit-loans',
    method: 'post',
    invalidateKeys: LOAN_INVALIDATIONS,
  });
}

export function useUpdateCreditLoan(id: string) {
  return useMutate<Partial<TCreditLoanPayload>, TCreditLoan>({
    url: `/api/v1/credit-loans/${id}`,
    method: 'patch',
    invalidateKeys: LOAN_INVALIDATIONS,
  });
}

/**
 * Deleting a loan leaves its repayment expenses in the ledger, so this is a
 * ledger event: the transactions list and balances must re-read.
 */
export function useDeleteCreditLoan(id: string) {
  return useMutate<void, { keptTransactionCount: number }>({
    url: `/api/v1/credit-loans/${id}`,
    method: 'delete',
    invalidateKeys: [...LEDGER_KEYS, [CREDIT_LOANS_KEY]],
  });
}

/** A repayment creates a real expense — full ledger blast radius. */
export function useRepayCreditLoan(id: string) {
  return useMutate<
    { amountCentavos: number; paidDate?: string; note?: string | null },
    { transactionId: string }
  >({
    url: `/api/v1/credit-loans/${id}/repay`,
    method: 'post',
    invalidateKeys: [...LEDGER_KEYS, [CREDIT_LOANS_KEY]],
  });
}

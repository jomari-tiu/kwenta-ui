import { useGet, useMutate } from '@/lib/api';
import {
  CALENDAR_KEY,
  DASHBOARD_KEY,
  INSTALLMENTS_KEY,
  LEDGER_KEYS,
  toKeyPart,
} from '@/lib/queryKeys';
import type {
  TInstallmentSummary,
  TPlan,
  TPlanPayload,
  TPlanWithPayments,
  TScheduledPayment,
} from '../_types';

export function useInstallmentPlans(status: 'active' | 'completed' | 'all') {
  return useGet<TPlan[]>({
    isList: true,
    url: '/api/v1/installment-plans',
    key: [INSTALLMENTS_KEY, 'list', toKeyPart(status)],
    params: { status, pageNumber: 1, pageSize: 100 },
    staleTime: 60_000,
  });
}

export function useInstallmentSummary() {
  return useGet<TInstallmentSummary>({
    url: '/api/v1/installment-plans/summary',
    key: [INSTALLMENTS_KEY, 'summary'],
    staleTime: 60_000,
  });
}

export function useInstallmentPlan(id: string) {
  return useGet<TPlanWithPayments>({
    url: `/api/v1/installment-plans/${id}`,
    key: [INSTALLMENTS_KEY, toKeyPart(id)],
    enabled: Boolean(id),
  });
}

/**
 * Creating or editing a plan materializes DUES, not transactions — no money has
 * moved. So this invalidates installments (the list), calendar (the due markers
 * and overdue red) and dashboard (the pending count), but deliberately NOT
 * budgets, accounts or transactions.
 */
const PLAN_INVALIDATIONS = [
  [INSTALLMENTS_KEY],
  [CALENDAR_KEY],
  [DASHBOARD_KEY],
];

export function useCreateInstallmentPlan() {
  return useMutate<TPlanPayload, TPlanWithPayments>({
    url: '/api/v1/installment-plans',
    method: 'post',
    invalidateKeys: PLAN_INVALIDATIONS,
  });
}

export function useUpdateInstallmentPlan(id: string) {
  return useMutate<Partial<TPlanPayload>, TPlanWithPayments>({
    url: `/api/v1/installment-plans/${id}`,
    method: 'patch',
    invalidateKeys: PLAN_INVALIDATIONS,
  });
}

export function useDeleteInstallmentPlan(id: string) {
  return useMutate<
    void,
    { deletedPlanId: string; deletedTransactionCount: number }
  >({
    url: `/api/v1/installment-plans/${id}`,
    method: 'delete',
    invalidateKeys: LEDGER_KEYS,
  });
}

/**
 * Mark paid creates an expense server-side, so it has the IDENTICAL blast
 * radius as a transaction write. Using the same constant guarantees the two
 * paths cannot drift.
 */
export function useMarkInstallmentPaid(planId: string) {
  return useMutate<
    { paymentId: string; paidDate?: string },
    { transactionId: string }
  >({
    url: (v) =>
      `/api/v1/installment-plans/${planId}/payments/${v.paymentId}/pay`,
    method: 'post',
    invalidateKeys: LEDGER_KEYS,
  });
}

export function useUnmarkInstallmentPaid(planId: string) {
  return useMutate<{ paymentId: string }, unknown>({
    url: (v) =>
      `/api/v1/installment-plans/${planId}/payments/${v.paymentId}/unpay`,
    method: 'post',
    invalidateKeys: LEDGER_KEYS,
  });
}

/**
 * Server-side schedule preview.
 *
 * Deliberately NOT used for the live form preview — that would put a round trip
 * between typing "12" and seeing the schedule. The client generates the preview
 * locally via _schedule.ts, and this endpoint exists so the post-create
 * mismatch check has something authoritative to compare against.
 */
export function usePreviewSchedule() {
  return useMutate<
    {
      totalCentavos: number;
      termMonths: number;
      startDate: string;
      dayOfMonth: number;
    },
    { payments: TScheduledPayment[] }
  >({
    url: '/api/v1/installment-plans/preview',
    method: 'post',
  });
}

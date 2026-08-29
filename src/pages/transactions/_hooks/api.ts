import { keepPreviousData } from '@tanstack/react-query';
import { apiGetBlob, useGet, useMutate } from '@/lib/api';
import { LEDGER_KEYS, TRANSACTIONS_KEY, toKeyPart } from '@/lib/queryKeys';
import type {
  TTransaction,
  TTransactionFilters,
  TTransactionPayload,
  TTransactionSummary,
} from '../_types';

/**
 * The ONLY place money-moving transaction mutations are defined.
 *
 * The calendar day panel imports these rather than defining its own — two
 * copies would mean two invalidation lists, and the day someone updates one and
 * not the other is the day the dashboard goes quietly stale.
 */
export const PAGE_SIZE = 20;

function filterParams(
  filters: TTransactionFilters,
): Record<string, string | number | undefined> {
  return {
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId?.length
      ? { categoryId: filters.categoryId.join(',') }
      : {}),
    ...(filters.accountId?.length
      ? { accountId: filters.accountId.join(',') }
      : {}),
    ...(filters.amountMinCentavos !== undefined
      ? { amountMinCentavos: filters.amountMinCentavos }
      : {}),
    ...(filters.amountMaxCentavos !== undefined
      ? { amountMaxCentavos: filters.amountMaxCentavos }
      : {}),
    ...(filters.search ? { search: filters.search } : {}),
    sortBy: filters.sortBy ?? 'date',
    sortDir: filters.sortDir ?? 'desc',
  };
}

export function useTransactions(
  filters: TTransactionFilters,
  page: number,
  pageSize = PAGE_SIZE,
) {
  return useGet<TTransaction[]>({
    isList: true,
    url: '/api/v1/transactions',
    key: [
      TRANSACTIONS_KEY,
      'list',
      toKeyPart(filters.dateFrom),
      toKeyPart(filters.dateTo),
      toKeyPart(filters.type),
      toKeyPart(filters.categoryId?.join(',')),
      toKeyPart(filters.accountId?.join(',')),
      toKeyPart(filters.amountMinCentavos),
      toKeyPart(filters.amountMaxCentavos),
      toKeyPart(filters.search),
      toKeyPart(filters.sortBy),
      toKeyPart(filters.sortDir),
      toKeyPart(page),
      toKeyPart(pageSize),
    ],
    params: { ...filterParams(filters), pageNumber: page, pageSize },
    // Stops the table collapsing to empty on every page change.
    placeholderData: keepPreviousData,
  });
}

/** The list endpoint's `summary` block, spanning all matching rows. */
export function useTransactionsSummary(
  filters: TTransactionFilters,
  page: number,
  pageSize = PAGE_SIZE,
) {
  const query = useTransactions(filters, page, pageSize);
  const payload = query.data?.payload as
    { summary?: TTransactionSummary } | undefined;
  return payload?.summary;
}

export function useCreateTransaction() {
  return useMutate<TTransactionPayload, TTransaction>({
    url: '/api/v1/transactions',
    method: 'post',
    invalidateKeys: LEDGER_KEYS,
  });
}

export function useUpdateTransaction(id: string) {
  return useMutate<Partial<TTransactionPayload>, TTransaction>({
    url: `/api/v1/transactions/${id}`,
    method: 'patch',
    invalidateKeys: LEDGER_KEYS,
  });
}

export function useDeleteTransaction(id: string) {
  return useMutate<void, void>({
    url: `/api/v1/transactions/${id}`,
    method: 'delete',
    invalidateKeys: LEDGER_KEYS,
  });
}

/**
 * Server-side export, so the file contains every matching row rather than the
 * 20 currently on screen.
 */
export async function downloadTransactionsCsv(
  filters: TTransactionFilters,
): Promise<void> {
  const blob = await apiGetBlob(
    '/api/v1/transactions/export.csv',
    filterParams(filters),
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().getFullYear()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

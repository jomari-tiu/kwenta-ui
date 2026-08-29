import { useGet, useMutate } from '@/lib/api';
import {
  ACCOUNTS_KEY,
  DASHBOARD_KEY,
  TRANSACTIONS_KEY,
  toKeyPart,
} from '@/lib/queryKeys';
import type { TAccount, TDeleteAccountResult } from '../_types';

export type TAccountPayload = {
  name: string;
  kind?: TAccount['kind'];
  icon?: string;
  color?: string;
  openingBalanceCentavos?: number;
  creditLimitCentavos?: number | null;
  isDefault?: boolean;
};

/** 5-minute staleTime for the same reason as categories: picker reads. */
export function useAccounts(
  args: { search?: string; includeArchived?: boolean } = {},
) {
  return useGet<TAccount[]>({
    isList: true,
    url: '/api/v1/accounts',
    key: [
      ACCOUNTS_KEY,
      toKeyPart(args.search),
      toKeyPart(args.includeArchived),
    ],
    params: {
      ...(args.search ? { search: args.search } : {}),
      ...(args.includeArchived ? { includeArchived: 'true' } : {}),
      pageNumber: 1,
      pageSize: 100,
    },
    staleTime: 5 * 60_000,
  });
}

export function useAccountBalances() {
  return useGet<TAccount[]>({
    url: '/api/v1/accounts/balances',
    key: [ACCOUNTS_KEY, 'balances'],
    staleTime: 30_000,
  });
}

// Editing an opening balance changes the derived balance and the dashboard net;
// account names render inside cached transaction rows. NOT calendar (day cells
// don't show accounts) and NOT budgets (caps are per-category).
const ACCOUNT_INVALIDATIONS = [
  [ACCOUNTS_KEY],
  [TRANSACTIONS_KEY],
  [DASHBOARD_KEY],
];

export function useCreateAccount() {
  return useMutate<TAccountPayload, TAccount>({
    url: '/api/v1/accounts',
    method: 'post',
    invalidateKeys: ACCOUNT_INVALIDATIONS,
  });
}

export function useUpdateAccount(id: string) {
  return useMutate<TAccountPayload, TAccount>({
    url: `/api/v1/accounts/${id}`,
    method: 'patch',
    invalidateKeys: ACCOUNT_INVALIDATIONS,
  });
}

export function useDeleteAccount(id: string) {
  return useMutate<void, TDeleteAccountResult>({
    url: `/api/v1/accounts/${id}`,
    method: 'delete',
    invalidateKeys: ACCOUNT_INVALIDATIONS,
  });
}

export function useRestoreAccount(id: string) {
  return useMutate<void, TAccount>({
    url: `/api/v1/accounts/${id}/restore`,
    method: 'post',
    invalidateKeys: ACCOUNT_INVALIDATIONS,
  });
}

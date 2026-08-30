import { useGet, useMutate, type TListMeta } from '@/lib/api';
import { CATEGORIES_KEY, LABEL_KEYS, toKeyPart } from '@/lib/queryKeys';
import type {
  TCategory,
  TCategoryKind,
  TCategoryScope,
  TDeleteCategoryResult,
} from '../_types';

export type TCategoryPayload = {
  name: string;
  kind?: TCategoryKind;
  icon?: string;
  color?: string;
  monthlyBudgetCentavos?: number | null;
};

/**
 * 5-minute staleTime: this list is read by every form's picker on every open.
 * The mutations below invalidate explicitly, so it is never actually stale.
 */
export function useCategories(
  args: {
    kind?: TCategoryKind;
    /** Personal pickers must not offer business categories, and vice versa. */
    scope?: TCategoryScope;
    search?: string;
    includeArchived?: boolean;
  } = {},
) {
  return useGet<TCategory[]>({
    isList: true,
    url: '/api/v1/categories',
    key: [
      CATEGORIES_KEY,
      toKeyPart(args.kind),
      toKeyPart(args.scope),
      toKeyPart(args.search),
      toKeyPart(args.includeArchived),
    ],
    params: {
      ...(args.kind ? { kind: args.kind } : {}),
      ...(args.scope ? { scope: args.scope } : {}),
      ...(args.search ? { search: args.search } : {}),
      ...(args.includeArchived ? { includeArchived: 'true' } : {}),
      pageNumber: 1,
      pageSize: 100,
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  return useMutate<TCategoryPayload, TCategory>({
    url: '/api/v1/categories',
    method: 'post',
    invalidateKeys: [[CATEGORIES_KEY], ...LABEL_KEYS],
  });
}

export function useUpdateCategory(id: string) {
  return useMutate<TCategoryPayload, TCategory>({
    url: `/api/v1/categories/${id}`,
    method: 'patch',
    invalidateKeys: [[CATEGORIES_KEY], ...LABEL_KEYS],
  });
}

export function useDeleteCategory(id: string) {
  return useMutate<void, TDeleteCategoryResult>({
    url: `/api/v1/categories/${id}`,
    method: 'delete',
    invalidateKeys: [[CATEGORIES_KEY], ...LABEL_KEYS],
  });
}

export function useRestoreCategory(id: string) {
  return useMutate<void, TCategory>({
    url: `/api/v1/categories/${id}/restore`,
    method: 'post',
    invalidateKeys: [[CATEGORIES_KEY], ...LABEL_KEYS],
  });
}

export type { TListMeta };

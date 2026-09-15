/**
 * One central registry, deviating from the POS's module-scoped `<NAME>_KEY`
 * convention.
 *
 * Why: in the POS, modules are independent — editing a project doesn't change
 * the discounts list. Here the product is cross-cutting aggregates, so a
 * transaction edit legitimately touches several other modules' caches. Keeping
 * the keys per-module would mean real import edges between data layers. A
 * handful of string constants in one file ends that whole category of problem.
 */
export const AUTH_KEY = 'auth';
export const TRANSACTIONS_KEY = 'transactions';
export const DASHBOARD_KEY = 'dashboard';
export const CATEGORIES_KEY = 'categories';
export const ACCOUNTS_KEY = 'accounts';
export const BUDGETS_KEY = 'budgets';

/**
 * Every query whose answer depends on the ledger. ANY mutation that moves money
 * invalidates all of it.
 *
 * Note BUDGETS_KEY is root-only rather than [BUDGETS_KEY, month]: editing a
 * transaction's date and category can move the meter in TWO months and TWO
 * categories at once.
 *
 * This looks expensive and isn't. invalidateQueries only REFETCHES queries that
 * are currently mounted; the rest are marked stale and refetch lazily on next
 * mount. Do not "optimise" this into narrow keys that then go stale.
 */
export const LEDGER_KEYS: string[][] = [
  [TRANSACTIONS_KEY],
  [DASHBOARD_KEY],
  [BUDGETS_KEY],
  [ACCOUNTS_KEY],
];

/** Queries that render category/account LABELS but not their amounts. */
export const LABEL_KEYS: string[][] = [
  [TRANSACTIONS_KEY],
  [DASHBOARD_KEY],
  [BUDGETS_KEY],
];

/**
 * Normalise an optional query-key part.
 *
 * Not busywork: if one call site passes `undefined` for an unset filter and
 * another passes `''`, you get two cache entries for identical data and a UI
 * that flickers between them on refetch.
 */
export function toKeyPart(
  v: string | number | boolean | null | undefined,
): string {
  return v === null || v === undefined ? '' : String(v);
}

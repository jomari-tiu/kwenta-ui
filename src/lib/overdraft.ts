import type { TCentavos } from './money';

export type TOverdraftAccount = {
  id: string;
  name: string;
  kind: string;
  currentBalanceCentavos: TCentavos;
};

export type TOverdraftRisk = {
  accountName: string;
  /** Balance before this entry, with any edited row's effect already backed out. */
  currentCentavos: TCentavos;
  projectedCentavos: TCentavos;
  /** True when the account was ALREADY negative — the wording differs. */
  wasAlreadyNegative: boolean;
};

export type TOverdraftInput = {
  type: 'income' | 'expense';
  accountId: string;
  amountCentavos: TCentavos;
  accounts: TOverdraftAccount[];
  /**
   * The row being replaced, when editing. Its effect is backed out first, so
   * lowering a ₱5,000 expense to ₱3,000 does not read as another ₱3,000 leaving
   * the account.
   */
  existing?: {
    accountId: string;
    type: 'income' | 'expense';
    amountCentavos: TCentavos;
  } | null;
};

/**
 * Would this entry leave the account below zero?
 *
 * A WARNING input, never a block. The app records what happened; refusing to
 * save an overdraft would make the books wrong on purpose, and a negative
 * balance is itself the signal that something needs attention. See
 * docs/conventions.md.
 *
 * Returns null when there is nothing to warn about.
 */
export function overdraftRisk({
  type,
  accountId,
  amountCentavos,
  accounts,
  existing,
}: TOverdraftInput): TOverdraftRisk | null {
  // Money coming IN can never overdraw.
  if (type !== 'expense') return null;
  if (amountCentavos <= 0) return null;

  const account = accounts.find((a) => a.id === accountId);
  if (!account) return null;

  // A credit card is SUPPOSED to go negative — that is what carrying a balance
  // is. Warning here would fire on every correct use.
  if (account.kind === 'credit_card') return null;

  let base = account.currentBalanceCentavos;
  if (existing && existing.accountId === accountId) {
    base +=
      existing.type === 'expense'
        ? existing.amountCentavos
        : -existing.amountCentavos;
  }

  const projectedCentavos = base - amountCentavos;
  if (projectedCentavos >= 0) return null;

  return {
    accountName: account.name,
    currentCentavos: base,
    projectedCentavos,
    wasAlreadyNegative: base < 0,
  };
}

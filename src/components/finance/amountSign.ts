/**
 * How a ledger row's amount should be SIGNED and COLOURED.
 *
 * Its own module rather than part of AmountText.tsx because that file may only
 * export components (fast refresh), and because the convention is the part
 * worth reading: which axis a number sits on is a decision, not formatting.
 */
import type { TCentavos } from '@/lib/money';
import type { AmountTextProps } from './AmountText';

/**
 * Re-signs a fund movement onto the SAVINGS axis: positive means money went
 * INTO the fund.
 *
 * The ledger stores a contribution as an `expense` — cash really did leave the
 * account — and a withdrawal as `income`. Rendering one by its raw ledger type
 * puts a red minus under a heading that says the money is still yours, and
 * disagrees with the section total beside it, which counts contributions up.
 * A helper rather than a `type === 'expense'` test at each call site, because
 * "an expense put money in" is the part that reads backwards.
 */
export function fundSignedCentavos(entry: {
  type: 'income' | 'expense' | 'transfer';
  amountCentavos: TCentavos;
}): TCentavos {
  return entry.type === 'expense'
    ? entry.amountCentavos
    : -entry.amountCentavos;
}

/**
 * How one ledger row's amount should read. Keyed off the ROW, not off whichever
 * list is rendering it, so a fund contribution looks the same in the day panel
 * as it does in the transactions table.
 */
export function amountPropsFor(row: {
  type: 'income' | 'expense' | 'transfer';
  amountCentavos: TCentavos;
  investmentId: string | null;
}): Pick<AmountTextProps, 'centavos' | 'kind'> {
  // A fund row is neither income nor spending: the money only changed pocket.
  if (row.investmentId !== null) {
    return { centavos: fundSignedCentavos(row), kind: 'saved' };
  }
  // A transfer changes no total, so a + or − on it would be a lie.
  return {
    centavos: row.amountCentavos,
    kind: row.type === 'transfer' ? 'plain' : row.type,
  };
}

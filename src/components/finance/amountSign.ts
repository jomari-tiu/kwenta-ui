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
 * How one ledger row's amount should read. Keyed off the ROW, not off whichever
 * list is rendering it, so a row looks the same wherever it appears.
 */
export function amountPropsFor(row: {
  type: 'income' | 'expense' | 'transfer';
  amountCentavos: TCentavos;
}): Pick<AmountTextProps, 'centavos' | 'kind'> {
  // A transfer changes no total, so a + or − on it would be a lie.
  return {
    centavos: row.amountCentavos,
    kind: row.type === 'transfer' ? 'plain' : row.type,
  };
}

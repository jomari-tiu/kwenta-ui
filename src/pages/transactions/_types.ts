import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export type TLedgerType = 'income' | 'expense';

export type TTransactionRef = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type TTransaction = {
  id: string;
  type: TLedgerType;
  amountCentavos: number;
  txnDate: string;
  note: string | null;
  source: 'manual' | 'recurring' | 'installment';
  /**
   * Set when this expense came from marking an installment payment paid. The
   * day panel merges such a row with its due so the same money is not shown
   * twice.
   */
  installmentPaymentId: string | null;
  /** Set when this expense is a credit-loan repayment — READ-ONLY here. */
  creditLoanId: string | null;
  recurringRuleId: string | null;
  isEdited: boolean;
  category: TTransactionRef;
  account: TTransactionRef;
};

export type TTransactionSummary = {
  incomeCentavos: number;
  expenseCentavos: number;
  netCentavos: number;
  count: number;
};

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  // A string, because FormMoneyInput writes strings. The page converts to
  // centavos at the API boundary via parsePesoInput().
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter an amount above zero'),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  note: z.string().max(200).optional(),
});

export type TTransactionFormValues = z.infer<typeof transactionSchema>;

export type TTransactionPayload = {
  type: TLedgerType;
  amountCentavos: number;
  txnDate: string;
  categoryId: string;
  accountId: string;
  note?: string | null;
};

export type TTransactionFilters = {
  dateFrom?: string;
  dateTo?: string;
  type?: TLedgerType;
  categoryId?: string[];
  accountId?: string[];
  amountMinCentavos?: number;
  amountMaxCentavos?: number;
  search?: string;
  sortBy?: 'date' | 'amount' | 'created';
  sortDir?: 'asc' | 'desc';
};

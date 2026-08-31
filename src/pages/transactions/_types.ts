import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export type TLedgerType = 'income' | 'expense';
/** A transfer moves money between your own accounts — neither in nor out. */
export type TEntryType = TLedgerType | 'transfer';

export type TTransactionRef = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type TTransaction = {
  id: string;
  type: TEntryType;
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
  /** Set when this row moves money into or out of a fund — READ-ONLY here. */
  investmentId: string | null;
  /** Set when the row belongs to a business's books. Read-only on this screen. */
  businessId: string | null;
  businessName: string | null;
  recurringRuleId: string | null;
  isEdited: boolean;
  /** For a transfer this is a display-only stand-in; the row has no category. */
  category: TTransactionRef;
  /** Source account. For a transfer, money LEAVES this one. */
  account: TTransactionRef;
  /** Destination account — set only on transfers. */
  transferAccount: TTransactionRef | null;
};

export type TTransactionSummary = {
  /** Personal income: excludes fund withdrawals and business revenue. */
  incomeCentavos: number;
  /** Every expense row, funds and business costs included. */
  expenseCentavos: number;
  /** Money consumed: excludes fund contributions and business costs. */
  spendingCentavos: number;
  /** Net moved into funds. Still yours. */
  savedCentavos: number;
  /** Business revenue minus costs. */
  businessNetCentavos: number;
  /** Total moved by transfers. Not part of net — a transfer changes no total. */
  transferCentavos: number;
  netCentavos: number;
  count: number;
};

export const transactionSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    // A string, because FormMoneyInput writes strings. The page converts to
    // centavos at the API boundary via parsePesoInput().
    amount: z
      .string()
      .min(1, 'Enter an amount')
      .refine(
        (v) => (parsePesoInput(v) ?? 0) > 0,
        'Enter an amount above zero',
      ),
    txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    // Conditional rather than always-required: a transfer has no category,
    // and an income/expense has no destination.
    categoryId: z.string(),
    accountId: z.string().min(1, 'Account is required'),
    transferAccountId: z.string(),
    note: z.string().max(200).optional(),
  })
  .refine((v) => v.type === 'transfer' || v.categoryId.length > 0, {
    message: 'Category is required',
    path: ['categoryId'],
  })
  .refine((v) => v.type !== 'transfer' || v.transferAccountId.length > 0, {
    message: 'Destination account is required',
    path: ['transferAccountId'],
  })
  .refine((v) => v.type !== 'transfer' || v.accountId !== v.transferAccountId, {
    message: 'Choose two different accounts',
    path: ['transferAccountId'],
  });

export type TTransactionFormValues = z.infer<typeof transactionSchema>;

export type TTransactionPayload = {
  type: TEntryType;
  amountCentavos: number;
  txnDate: string;
  categoryId?: string;
  accountId: string;
  transferAccountId?: string;
  note?: string | null;
};

/** The five buckets partition the ledger: every row is in exactly one. */
export type TTransactionBucket =
  'spending' | 'income' | 'invested' | 'business' | 'transfer';

export type TTransactionFilters = {
  bucket?: TTransactionBucket;
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

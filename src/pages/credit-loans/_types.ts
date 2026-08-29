import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export type TLoanStatus = 'settled' | 'overdue' | 'dueSoon' | 'open';

export type TCreditLoan = {
  id: string;
  name: string;
  lender: string | null;
  principalCentavos: number;
  repaidCentavos: number;
  outstandingCentavos: number;
  percentRepaid: number;
  /** null means no agreed date. Such a loan is never overdue. */
  dueDate: string | null;
  categoryId: string;
  accountId: string;
  note: string | null;
  isSettled: boolean;
  status: TLoanStatus;
};

export type TLoanRepayment = {
  id: string;
  amountCentavos: number;
  txnDate: string;
  note: string | null;
};

export type TCreditLoanDetail = TCreditLoan & {
  repayments: TLoanRepayment[];
};

export type TCreditLoanSummary = {
  openCount: number;
  overdueCount: number;
  undatedCount: number;
  totalOutstandingCentavos: number;
  nextDueDate: string | null;
};

export const creditLoanSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  lender: z.string().max(80).optional(),
  principal: z
    .string()
    .min(1, 'Enter the amount')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter an amount above zero'),
  /**
   * Optional by design. An empty string means "no agreed date" and is sent to
   * the API as null — it is NOT a validation error.
   */
  dueDate: z
    .string()
    .refine(
      (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
      'Use a valid date, or leave it blank',
    ),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  note: z.string().max(200).optional(),
});

export type TCreditLoanFormValues = z.infer<typeof creditLoanSchema>;

export type TCreditLoanPayload = {
  name: string;
  lender?: string | null;
  principalCentavos: number;
  dueDate?: string | null;
  categoryId: string;
  accountId: string;
  note?: string | null;
};

export const repaySchema = z.object({
  amount: z
    .string()
    .min(1, 'Enter the amount')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter an amount above zero'),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  note: z.string().max(200).optional(),
});

export type TRepayFormValues = z.infer<typeof repaySchema>;

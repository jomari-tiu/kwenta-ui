import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export type TDerivedStatus = 'paid' | 'overdue' | 'dueSoon' | 'pending';

export type TScheduledPayment = {
  sequenceNo: number;
  dueDate: string;
  amountCentavos: number;
};

export type TPayment = TScheduledPayment & {
  id: string;
  status: 'pending' | 'paid';
  paidDate: string | null;
  derivedStatus: TDerivedStatus;
};

export type TPlan = {
  id: string;
  name: string;
  merchant: string | null;
  totalCentavos: number;
  termMonths: number;
  startDate: string;
  dayOfMonth: number;
  categoryId: string;
  accountId: string;
  note: string | null;
  paidCount: number;
  paidCentavos: number;
  remainingCentavos: number;
  percentPaid: number;
  nextDueDate: string | null;
  overdueCount: number;
  isCompleted: boolean;
};

export type TPlanWithPayments = TPlan & { payments: TPayment[] };

export type TInstallmentSummary = {
  activePlanCount: number;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  totalRemainingCentavos: number;
  nextDueDate: string | null;
};

export const planSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  merchant: z.string().max(80).optional(),
  // Strings — FormMoneyInput / FormNumberInput write strings.
  total: z
    .string()
    .min(1, 'Enter the total')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter a total above zero'),
  termMonths: z
    .string()
    .min(1, 'Enter the number of months')
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 120;
    }, 'Between 1 and 120 months'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
  dayOfMonth: z
    .string()
    .min(1, 'Pick a day')
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 31;
    }, 'Between 1 and 31'),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  note: z.string().max(200).optional(),
});

export type TPlanFormValues = z.infer<typeof planSchema>;

export type TPlanPayload = {
  name: string;
  merchant?: string | null;
  totalCentavos: number;
  termMonths: number;
  startDate: string;
  dayOfMonth: number;
  categoryId: string;
  accountId: string;
  note?: string | null;
};

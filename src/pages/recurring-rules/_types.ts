import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'yearly'] as const;
export type TFrequency = (typeof FREQUENCIES)[number];

export type TRecurringRule = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amountCentavos: number;
  frequency: TFrequency;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  categoryId: string;
  accountId: string;
  note: string | null;
  isActive: boolean;
  nextOccurrence: string | null;
};

export const ruleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: z.enum(['income', 'expense']),
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter an amount above zero'),
  frequency: z.enum(FREQUENCIES),
  dayOfWeek: z.string(),
  dayOfMonth: z.string(),
  monthOfYear: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
  endDate: z.string(),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  note: z.string().max(200).optional(),
});

export type TRuleFormValues = z.infer<typeof ruleSchema>;

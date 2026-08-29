import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export const INVESTMENT_KINDS = [
  'fund',
  'stocks',
  'crypto',
  'time_deposit',
  'savings_goal',
  'insurance',
  'other',
] as const;

export type TInvestmentKind = (typeof INVESTMENT_KINDS)[number];

export const KIND_LABELS: Record<TInvestmentKind, string> = {
  fund: 'Mutual fund / UITF',
  stocks: 'Stocks',
  crypto: 'Crypto',
  time_deposit: 'Time deposit',
  savings_goal: 'Savings goal',
  insurance: 'Insurance / VUL',
  other: 'Other',
};

export type TInvestmentStatus = 'closed' | 'funded' | 'active';

export type TInvestment = {
  id: string;
  name: string;
  provider: string | null;
  kind: TInvestmentKind;
  contributedCentavos: number;
  withdrawnCentavos: number;
  netContributedCentavos: number;
  /** null means no goal — render no progress bar at all. */
  targetCentavos: number | null;
  percentToTarget: number | null;
  targetDate: string | null;
  /** null means not valued — show what went in, never a made-up return. */
  currentValueCentavos: number | null;
  valueAsOf: string | null;
  gainCentavos: number | null;
  gainPercent: number | null;
  categoryId: string;
  accountId: string;
  note: string | null;
  isClosed: boolean;
  status: TInvestmentStatus;
};

export type TInvestmentFlow = {
  id: string;
  type: 'income' | 'expense';
  amountCentavos: number;
  txnDate: string;
  note: string | null;
};

export type TInvestmentDetail = TInvestment & { flows: TInvestmentFlow[] };

export type TInvestmentSummary = {
  activeCount: number;
  fundedCount: number;
  untargetedCount: number;
  totalNetContributedCentavos: number;
  totalCurrentValueCentavos: number | null;
  totalGainCentavos: number | null;
  nextTargetDate: string | null;
};

/** '' means "not set" for every optional field, and is NEVER an error. */
const optionalMoney = z
  .string()
  .refine(
    (v) => v === '' || (parsePesoInput(v) ?? 0) > 0,
    'Enter an amount above zero, or leave it blank',
  );

const optionalDate = z
  .string()
  .refine(
    (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
    'Use a valid date, or leave it blank',
  );

export const investmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  provider: z.string().max(80).optional(),
  kind: z.enum(INVESTMENT_KINDS),
  target: optionalMoney,
  targetDate: optionalDate,
  currentValue: optionalMoney,
  valueAsOf: optionalDate,
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  note: z.string().max(200).optional(),
});

export type TInvestmentFormValues = z.infer<typeof investmentSchema>;

export type TInvestmentPayload = {
  name: string;
  provider?: string | null;
  kind: TInvestmentKind;
  targetCentavos?: number | null;
  targetDate?: string | null;
  currentValueCentavos?: number | null;
  valueAsOf?: string | null;
  categoryId: string;
  accountId: string;
  note?: string | null;
};

export const contributeSchema = z.object({
  amount: z
    .string()
    .min(1, 'Enter the amount')
    .refine((v) => (parsePesoInput(v) ?? 0) > 0, 'Enter an amount above zero'),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  note: z.string().max(200).optional(),
});

export type TContributeFormValues = z.infer<typeof contributeSchema>;

/** Withdrawing needs its own income category — the money has to land somewhere. */
export const withdrawSchema = contributeSchema.extend({
  categoryId: z.string().min(1, 'Pick where this money lands'),
});

export type TWithdrawFormValues = z.infer<typeof withdrawSchema>;

import { z } from 'zod';

export const ACCOUNT_KINDS = [
  'cash',
  'ewallet',
  'bank',
  'credit_card',
  'savings',
  'other',
] as const;

export type TAccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<TAccountKind, string> = {
  cash: 'Cash',
  ewallet: 'E-wallet',
  bank: 'Bank',
  credit_card: 'Credit card',
  savings: 'Savings',
  other: 'Other',
};

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(ACCOUNT_KINDS),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour'),
  /** Strings — FormMoneyInput writes strings; the page converts. */
  openingBalance: z.string(),
  creditLimit: z.string(),
  isDefault: z.boolean(),
});

export type TAccountFormValues = z.infer<typeof accountSchema>;

export type TAccount = {
  id: string;
  name: string;
  kind: TAccountKind;
  icon: string | null;
  color: string | null;
  openingBalanceCentavos: number;
  openingBalanceDate: string | null;
  creditLimitCentavos: number | null;
  isDefault: boolean;
  sortOrder: number;
  isArchived: boolean;
  currentBalanceCentavos: number;
};

export type TDeleteAccountResult =
  { deleted: true } | { archived: true; referenceCount: number };

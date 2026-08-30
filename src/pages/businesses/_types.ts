import { z } from 'zod';
import { parsePesoInput } from '@/lib/money';

export type TBusiness = {
  id: string;
  name: string;
  note: string | null;
  /** Null when the business shares a personal account. */
  accountId: string | null;
  accountName: string | null;
  /** False when there is no separate pot: capital and drawings are hidden. */
  hasOwnAccount: boolean;
  startedOn: string | null;
  closedAt: string | null;
  isClosed: boolean;
  revenueCentavos: number;
  costCentavos: number;
  /** Cash-basis: revenue minus costs. Not accounting profit — no inventory. */
  netCashCentavos: number;
  capitalCentavos: number;
  drawingCentavos: number;
  expectedBalanceCentavos: number;
  /** Null without a dedicated account — there is nothing to check against. */
  actualBalanceCentavos: number | null;
  /** Zero is healthy. Anything else is a row the books cannot explain. */
  reconciliationDiffCentavos: number | null;
};

export type TBusinessEntryKind = 'revenue' | 'cost' | 'capital' | 'drawing';

export type TBusinessEntry = {
  id: string;
  kind: TBusinessEntryKind;
  type: 'income' | 'expense' | 'transfer';
  amountCentavos: number;
  txnDate: string;
  note: string | null;
  categoryName: string | null;
  /** True when nothing moved — capital or a drawing that is only recorded. */
  isEarmark: boolean;
};

export type TBusinessesSummary = {
  activeCount: number;
  totalNetCashCentavos: number;
  totalCapitalCentavos: number;
  totalDrawingCentavos: number;
  totalHeldCentavos: number;
  hasReconciliationGap: boolean;
};

const money = (label: string) =>
  z.string().refine((v) => {
    const c = parsePesoInput(v);
    return c !== null && c > 0;
  }, `${label} must be greater than zero`);

/** Sentinel: Select cannot hold an empty value, and "none" is a real choice. */
export const NO_ACCOUNT = '__none__';

export const businessSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  /** NO_ACCOUNT means "shares a personal account" — a valid, common answer. */
  accountId: z.string(),
  startedOn: z.string().nullable(),
  note: z.string().trim().max(200).nullable(),
});

export type TBusinessFormValues = z.infer<typeof businessSchema>;

export type TBusinessPayload = {
  name: string;
  accountId: string | null;
  startedOn: string | null;
  note: string | null;
};

export const entrySchema = z.object({
  kind: z.enum(['revenue', 'cost']),
  amount: money('Amount'),
  categoryId: z.string().min(1, 'Category is required'),
  /** Only asked for when the business has no account of its own. */
  accountId: z.string(),
  txnDate: z.string().min(1, 'Date is required'),
  note: z.string().trim().max(200).nullable(),
});

export type TEntryFormValues = z.infer<typeof entrySchema>;

/** Capital in and drawings out share a shape — only the account side differs. */
export const movementSchema = z.object({
  amount: money('Amount'),
  accountId: z.string().min(1, 'Pick an account'),
  txnDate: z.string().min(1, 'Date is required'),
  note: z.string().trim().max(200).nullable(),
});

export type TMovementFormValues = z.infer<typeof movementSchema>;

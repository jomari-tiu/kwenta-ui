import { z } from 'zod';

export type TCategoryKind = 'income' | 'expense';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  icon: z.string().min(1, 'Pick an icon'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour'),
  /**
   * A string, because FormMoneyInput writes strings. The page converts to
   * centavos at the API boundary.
   */
  monthlyBudget: z.string(),
});

export type TCategoryFormValues = z.infer<typeof categorySchema>;

export type TCategory = {
  id: string;
  name: string;
  kind: TCategoryKind;
  icon: string | null;
  color: string | null;
  monthlyBudgetCentavos: number | null;
  sortOrder: number;
  isArchived: boolean;
  transactionCount: number;
};

export type TDeleteCategoryResult =
  { deleted: true } | { archived: true; referenceCount: number };

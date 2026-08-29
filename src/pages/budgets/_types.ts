export type TBudget = {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  capCentavos: number | null;
  capSource: 'default' | 'override' | 'none';
  spentCentavos: number;
  remainingCentavos: number | null;
  percentUsed: number | null;
  isOverBudget: boolean;
  /** 80-100% of cap. Drives the amber state. */
  isNearLimit: boolean;
};

export type TBudgetsResult = {
  month: string;
  budgeted: TBudget[];
  unbudgeted: TBudget[];
  totals: {
    capCentavos: number;
    spentCentavos: number;
    remainingCentavos: number;
    isOverBudget: boolean;
  };
};

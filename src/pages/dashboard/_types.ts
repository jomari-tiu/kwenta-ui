export type TPeriod = 'week' | 'month' | 'year';

export type TSeriesPoint = {
  bucket: string;
  label: string;
  incomeCentavos: number;
  expenseCentavos: number;
  netCentavos: number;
  transactionCount: number;
};

export type TCategoryTotal = {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  totalCentavos: number;
  transactionCount: number;
};

export type TDashboardSummary = {
  period: TPeriod;
  label: string;
  from: string;
  to: string;
  incomeCentavos: number;
  /** Everything that left the account. */
  spendingCentavos: number;
  netCentavos: number;
  savingsRatePercent: number | null;
  netBalanceAllTimeCentavos: number;
  /** Spendable now: every live account except credit cards, whose balance is debt. */
  disposableCentavos: number;
  series: TSeriesPoint[];
  topCategories: TCategoryTotal[];
  accountBalances: {
    accountId: string;
    name: string;
    kind: string;
    icon: string | null;
    color: string | null;
    currentBalanceCentavos: number;
  }[];
  budgetAlerts: {
    categoryId: string;
    name: string;
    color: string | null;
    capCentavos: number;
    spentCentavos: number;
    percentUsed: number | null;
    isOverBudget: boolean;
  }[];
};

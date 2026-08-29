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
  /** Money consumed. Excludes anything moved into a savings pot. */
  spendingCentavos: number;
  /** Net moved into savings pots this period. */
  savedCentavos: number;
  /** Spending + savings — everything that left the account. */
  expenseCentavos: number;
  netCentavos: number;
  savingsRatePercent: number | null;
  netBalanceAllTimeCentavos: number;
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
  investments: {
    activeCount: number;
    fundedCount: number;
    untargetedCount: number;
    totalNetContributedCentavos: number;
    /** Null when nothing is valued — a ₱0 total would read as a total loss. */
    totalCurrentValueCentavos: number | null;
    totalGainCentavos: number | null;
    nextTargetDate: string | null;
  };
  creditLoans: {
    openCount: number;
    overdueCount: number;
    /** Loans with no agreed due date — open, but never overdue. */
    undatedCount: number;
    totalOutstandingCentavos: number;
    nextDueDate: string | null;
  };
  installments: {
    pendingCount: number;
    overdueCount: number;
    dueSoonCount: number;
    activePlanCount: number;
    totalRemainingCentavos: number;
    nextDueDate: string | null;
  };
};

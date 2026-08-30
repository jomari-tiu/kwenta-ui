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

/**
 * One thing still owed. Only installments and credit loans have a real unpaid
 * state — a recurring rule assumes payment on its date, so it never appears.
 */
export type TDueItem = {
  kind: 'installment' | 'loan';
  id: string;
  name: string;
  detail: string | null;
  amountCentavos: number;
  dueDate: string | null;
  status: 'overdue' | 'dueSoon' | 'upcoming' | 'undated';
  /** Negative when overdue. Null for a loan with no agreed date. */
  daysUntil: number | null;
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
  /** Everything still owed, most urgent first. Always as of today. */
  dueItems: TDueItem[];
  /** Spendable now: every live account except credit cards, whose balance is debt. */
  disposableCentavos: number;
  /** Sitting in investment pots — real money, but not spendable. */
  investedCentavos: number;
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
  businesses: {
    activeCount: number;
    /** Zero means no business holds money separately — nothing is "held". */
    withOwnAccountCount: number;
    /** Revenue minus costs across active businesses. Cash-basis. */
    netCashCentavos: number;
    /** Cash sitting in the business accounts right now. */
    heldCentavos: number;
    /** What the books say the businesses hold, wherever it sits. */
    ownedCentavos: number;
    /** True when a business's books disagree with its account balance. */
    hasReconciliationGap: boolean;
  };
  /** Business revenue minus costs for the browsed period only. */
  businessNetCentavos: number;
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

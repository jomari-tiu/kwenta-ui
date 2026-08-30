import type { TTransaction } from '@/pages/transactions/_types';

export type TDerivedStatus = 'paid' | 'overdue' | 'dueSoon' | 'pending';

export type TCalendarDue = {
  id: string;
  planId: string;
  planName: string;
  sequenceNo: number;
  termMonths: number;
  dueDate: string;
  amountCentavos: number;
  status: 'pending' | 'paid';
  paidDate: string | null;
  derivedStatus: TDerivedStatus;
  /**
   * The expense created by marking this due paid. When set, the day panel
   * renders ONE merged row rather than a due and a transaction for the same
   * money — "why is my rent listed twice" is how you stop trusting the app.
   */
  transactionId: string | null;
};

export type TCalendarLoanDue = {
  id: string;
  name: string;
  lender: string | null;
  dueDate: string;
  principalCentavos: number;
  /** Principal minus everything repaid so far — what the day actually costs. */
  outstandingCentavos: number;
  isOverdue: boolean;
};

/**
 * A savings goal landing on this day. NOT a due: being short of a goal is not
 * being late on a debt, so this never reddens the day.
 */
export type TCalendarFundTarget = {
  id: string;
  name: string;
  provider: string | null;
  targetDate: string;
  targetCentavos: number | null;
  netContributedCentavos: number;
  isReached: boolean;
};

export type TCalendarProjection = {
  ruleId: string;
  ruleName: string;
  type: 'income' | 'expense';
  amountCentavos: number;
  date: string;
};

export type TCalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  incomeCentavos: number;
  expenseCentavos: number;
  netCentavos: number;
  transactionCount: number;
  /** Moved between your own accounts. Neither income nor expense. */
  transferCentavos: number;
  /** Net moved into investment pots. Neither spending nor income. */
  savedCentavos: number;
  /** Net cash a business made that day. Neither personal income nor spending. */
  businessCentavos: number;
  hasOverdueInstallment: boolean;
  hasDueInstallment: boolean;
  hasProjectedRecurring: boolean;
  entries: TTransaction[];
  dues: TCalendarDue[];
  loanDues: TCalendarLoanDue[];
  fundTargets: TCalendarFundTarget[];
  projections: TCalendarProjection[];
};

export type TCalendarMonth = {
  month: string;
  gridStart: string;
  gridEnd: string;
  today: string;
  days: TCalendarDay[];
  totals: {
    incomeCentavos: number;
    expenseCentavos: number;
    savedCentavos: number;
    businessCentavos: number;
    netCentavos: number;
  };
  /** Kept separate from totals — a forecast must not become the headline. */
  projectedTotals: { incomeCentavos: number; expenseCentavos: number };
};

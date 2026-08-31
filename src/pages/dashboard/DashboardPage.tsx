import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Info, TriangleAlert } from 'lucide-react';
import {
  AmountText,
  ChartFrame,
  ErrorState,
  Meter,
  RankedBarList,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Imported by path, not via the barrel, so recharts stays in this route's chunk.
import { IncomeExpenseChart } from '@/components/finance/IncomeExpenseChart';
import { useGet } from '@/lib/api';
import { DASHBOARD_KEY, toKeyPart } from '@/lib/queryKeys';
import {
  addDays,
  addMonthsToKey,
  monthKeyOf,
  todayPlainDate,
} from '@/lib/date';
import { formatPeso, formatPeso0 } from '@/lib/money';
import type { TDashboardSummary, TDueItem, TPeriod } from './_types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TPeriod>('month');
  const [anchor, setAnchor] = useState(todayPlainDate());

  const { data, isPending, isError, refetch } = useGet<TDashboardSummary>({
    url: '/api/v1/dashboard/summary',
    key: [DASHBOARD_KEY, toKeyPart(period), toKeyPart(anchor)],
    params: { period, anchor },
    staleTime: 60_000,
  });

  const [explaining, setExplaining] = useState<'net' | 'disposable' | null>(
    null,
  );

  const d = data?.result;
  // Whether any business keeps its money in an account of its own. Without
  // that, "cash held" is not a thing the app can report.
  const hasOwnAccounts = (d?.businesses.withOwnAccountCount ?? 0) > 0;

  // Stable identity for the chart's data prop. Remapping inline would hand
  // recharts a new array on every render.
  const chartData = useMemo(
    () =>
      (d?.series ?? []).map((p) => ({
        label: p.label,
        income: p.incomeCentavos,
        expense: p.expenseCentavos,
      })),
    [d?.series],
  );

  function step(delta: number) {
    if (period === 'week') {
      setAnchor((a) => addDays(a, delta * 7));
    } else if (period === 'month') {
      setAnchor((a) => `${addMonthsToKey(monthKeyOf(a), delta)}-01`);
    } else {
      setAnchor((a) => `${Number(a.slice(0, 4)) + delta}${a.slice(4)}`);
    }
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load the dashboard"
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={period}
          onValueChange={(v) => {
            setPeriod(v as TPeriod);
            setAnchor(todayPlainDate());
          }}
        >
          <TabsList aria-label="Period">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => step(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold">
            {d?.label ?? '—'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => step(1)}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isPending && !d ? (
        <DashboardSkeleton />
      ) : d ? (
        <>
          {d.accountBalances.some(
            (a) => a.kind !== 'credit_card' && a.currentBalanceCentavos < 0,
          ) ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>An account is negative</AlertTitle>
              <AlertDescription>
                {d.accountBalances
                  .filter(
                    (a) =>
                      a.kind !== 'credit_card' && a.currentBalanceCentavos < 0,
                  )
                  .map(
                    (a) => `${a.name} ${formatPeso(a.currentBalanceCentavos)}`,
                  )
                  .join(' · ')}
                {' — '}check the account on those transactions.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* The two headline figures share a row and a size on purpose: they
              answer the two questions people actually ask — "how did this
              period go" and "what can I spend now" — and one being visually
              louder implied it was the more important of the two. */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <dt className="flex items-center justify-between gap-2 text-xs font-bold tracking-wide text-text-muted uppercase">
                Net this period
                <ExplainButton
                  label="How net is worked out"
                  onClick={() => setExplaining('net')}
                />
              </dt>
              <dd>
                <AmountText centavos={d.netCentavos} kind="net" size="hero" />
                <span className="mt-1 block text-sm text-text-muted">
                  for {d.label} · all-time net{' '}
                  {formatPeso0(d.netBalanceAllTimeCentavos)}
                </span>
              </dd>
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <dt className="flex items-center justify-between gap-2 text-xs font-bold tracking-wide text-text-muted uppercase">
                Disposable money
                <ExplainButton
                  label="How disposable money is worked out"
                  onClick={() => setExplaining('disposable')}
                />
              </dt>
              <dd>
                <AmountText
                  centavos={d.disposableCentavos}
                  kind="net"
                  size="hero"
                />
                <span className="mt-1 block text-sm text-text-muted">
                  across your accounts, ready to spend
                </span>
              </dd>
            </section>
          </dl>

          {/* Spending and Saved are separate on purpose: money in a fund is
              money you still have, and adding it to groceries would make the
              expense figure mean nothing. income − spending − saved = net. */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
                Invested money
              </dt>
              <dd className="mt-1">
                <AmountText centavos={d.investedCentavos} size="lg" />
                {/* "All in" counts what the pots HOLD, not just what was
                    contributed here — otherwise it silently omits money that
                    was already in them and reads lower than the truth. */}
                <span className="mt-0.5 block text-2xs text-text-muted">
                  set aside in funds ·{' '}
                  {formatPeso0(
                    d.disposableCentavos + d.investments.totalHeldCentavos,
                  )}{' '}
                  all in
                </span>
                {/* The headline counts only what was contributed THROUGH the
                    app. A pot that already held money reads far smaller than it
                    really is, so say what the funds are worth and name the gap
                    plainly — it is untracked money, never a profit. */}
                {d.investments.untrackedCentavos > 0 ? (
                  <span className="mt-0.5 block text-2xs text-text-muted">
                    worth {formatPeso0(d.investments.totalHeldCentavos)} today ·{' '}
                    {formatPeso0(d.investments.untrackedCentavos)} of it was
                    already there
                  </span>
                ) : null}
              </dd>
            </div>
            {/* Only once a business exists — an empty tile teaches nothing. */}
            {d.businesses.activeCount > 0 ? (
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
                  {hasOwnAccounts ? 'Business cash' : 'Business net cash'}
                </dt>
                <dd className="mt-1">
                  {/* Nothing is "held" when no business keeps money separately,
                      and a ₱0.00 headline beside a business that is doing fine
                      reads as a bug. */}
                  <AmountText
                    centavos={
                      hasOwnAccounts
                        ? d.businesses.heldCentavos
                        : d.businesses.netCashCentavos
                    }
                    size="lg"
                  />
                  <span className="mt-0.5 block text-2xs text-text-muted">
                    {hasOwnAccounts
                      ? `held by ${d.businesses.withOwnAccountCount} of ${d.businesses.activeCount} · not in Disposable money`
                      : `revenue − costs · kept out of Income and Spending`}
                  </span>
                  {/* Where the money came from. Without this the tile says a
                      business holds ₱19,860 and never says you put it there. */}
                  {d.businesses.capitalCentavos > 0 ? (
                    <span className="mt-0.5 block text-2xs text-text-muted">
                      {formatPeso0(d.businesses.capitalCentavos)} put in as
                      capital
                      {d.businesses.drawingCentavos > 0
                        ? ` · ${formatPeso0(d.businesses.drawingCentavos)} drawn back out`
                        : ''}
                    </span>
                  ) : null}
                  {hasOwnAccounts ? (
                    <span
                      className={cn(
                        'mt-0.5 block text-2xs font-semibold',
                        d.businesses.netCashCentavos >= 0
                          ? 'text-ink-income'
                          : 'text-ink-expense',
                      )}
                    >
                      {d.businesses.netCashCentavos >= 0 ? '+' : '−'}
                      {formatPeso0(Math.abs(d.businesses.netCashCentavos))} net
                      cash
                    </span>
                  ) : null}
                  {d.businesses.hasReconciliationGap ? (
                    <span className="mt-0.5 block text-2xs font-semibold text-ink-warn">
                      A business account has entries its books cannot explain
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Tile label="Income" centavos={d.incomeCentavos} tone="income" />
            <Tile
              label="Spending"
              centavos={d.spendingCentavos}
              tone="expense"
            />
            <Tile
              label="Saved"
              centavos={d.savedCentavos}
              hintTone="good"
              hint={
                d.savedCentavos > 0 && d.incomeCentavos > 0
                  ? `${Math.round((d.savedCentavos / d.incomeCentavos) * 100)}% of income`
                  : undefined
              }
            />
            <Tile
              label="Savings rate"
              raw={
                d.savingsRatePercent === null ? '—' : `${d.savingsRatePercent}%`
              }
            />
            <Tile
              label="Pending installments"
              raw={String(d.installments.pendingCount)}
              warn={d.installments.overdueCount > 0}
              hint={
                d.installments.overdueCount > 0
                  ? `${d.installments.overdueCount} overdue`
                  : undefined
              }
            />
            <Tile
              label="Loans outstanding"
              centavos={d.creditLoans.totalOutstandingCentavos}
              tone="expense"
              warn={d.creditLoans.overdueCount > 0}
              hint={
                d.creditLoans.overdueCount > 0
                  ? `${d.creditLoans.overdueCount} overdue`
                  : undefined
              }
            />
          </dl>

          <ExplainDialog
            which={explaining}
            summary={d}
            onClose={() => setExplaining(null)}
          />

          <DueList items={d.dueItems} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartFrame
                title="Income vs spending"
                subtitle={`${d.from} to ${d.to}`}
                legend={[
                  { label: 'Income', colorClass: 'bg-chart-income' },
                  { label: 'Spending', colorClass: 'bg-chart-expense' },
                ]}
                table={
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-2xs uppercase text-text-muted">
                        <tr>
                          <th className="py-1.5">Bucket</th>
                          <th className="py-1.5 text-right">Income</th>
                          <th className="py-1.5 text-right">Expense</th>
                          <th className="py-1.5 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody className="tnum">
                        {d.series.map((p) => (
                          <tr key={p.bucket} className="border-t">
                            <td className="py-1.5">{p.label}</td>
                            <td className="py-1.5 text-right text-ink-income">
                              {formatPeso(p.incomeCentavos)}
                            </td>
                            <td className="py-1.5 text-right text-ink-expense">
                              {formatPeso(p.expenseCentavos)}
                            </td>
                            <td className="py-1.5 text-right">
                              {formatPeso(p.netCentavos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              >
                <IncomeExpenseChart
                  data={chartData}
                  onBarClick={(i) => {
                    const bucket = d.series[i];
                    if (bucket) {
                      void navigate(
                        `/transactions?from=${bucket.bucket}&to=${d.to}`,
                      );
                    }
                  }}
                />
              </ChartFrame>
            </div>

            <ChartFrame
              title="Spending by category"
              subtitle={d.label}
              table={
                <ul className="tnum flex flex-col gap-1.5 text-sm">
                  {d.topCategories.map((c) => (
                    <li key={c.categoryId} className="flex justify-between">
                      <span>{c.name}</span>
                      <span>{formatPeso(c.totalCentavos)}</span>
                    </li>
                  ))}
                </ul>
              }
            >
              <RankedBarList
                items={d.topCategories.map((c) => ({
                  id: c.categoryId,
                  label: c.name,
                  color: c.color,
                  value: c.totalCentavos,
                }))}
                onSelect={(id) =>
                  void navigate(
                    `/transactions?categoryId=${id}&from=${d.from}&to=${d.to}`,
                  )
                }
                emptyMessage="No expenses in this period."
              />
            </ChartFrame>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">Budgets to watch</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate('/budgets')}
                >
                  View all
                </Button>
              </div>

              {d.budgetAlerts.length === 0 ? (
                <p className="py-4 text-sm text-text-muted">
                  Nothing near its cap this month.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.budgetAlerts.map((b) => (
                    <li key={b.categoryId}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm">
                          {b.isOverBudget ? (
                            <TriangleAlert className="size-3.5 text-danger" />
                          ) : null}
                          {b.name}
                        </span>
                        <span className="tnum text-sm">
                          {formatPeso(b.spentCentavos)} /{' '}
                          {formatPeso(b.capCentavos)}
                        </span>
                      </div>
                      <Meter
                        percent={b.percentUsed}
                        tone={b.isOverBudget ? 'danger' : 'warn'}
                        label={`${b.name} budget`}
                      />
                      {b.isOverBudget ? (
                        <p className="mt-1 text-xs font-semibold text-danger">
                          Over by {formatPeso(b.spentCentavos - b.capCentavos)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-base font-bold">Account balances</h3>
              <ul className="flex flex-col gap-2">
                {d.accountBalances.map((a) => (
                  <li
                    key={a.accountId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: a.color ?? 'var(--text-faint)' }}
                      />
                      <span className="truncate">{a.name}</span>
                    </span>
                    <AmountText
                      centavos={a.currentBalanceCentavos}
                      kind="net"
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** A quiet "?" that opens the working-out for the figure beside it. */
function ExplainButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-5 shrink-0 items-center justify-center rounded-full border text-text-muted transition-colors hover:bg-muted"
    >
      <Info className="size-3" aria-hidden />
    </button>
  );
}

type TExplainRow = { label: string; centavos: number; op: '+' | '-' | '=' };

/**
 * The arithmetic behind a headline figure, line by line.
 *
 * Built from the SAME fields the tile renders, never recomputed here — a
 * breakdown that derives its own numbers is one that can disagree with the
 * figure it claims to explain.
 */
function ExplainDialog({
  which,
  summary,
  onClose,
}: {
  which: 'net' | 'disposable' | null;
  summary: TDashboardSummary;
  onClose: () => void;
}) {
  if (which === null) return null;

  const isNet = which === 'net';

  const accountsTotal = summary.accountBalances
    .filter((a) => a.kind !== 'credit_card')
    .reduce((sum, a) => sum + a.currentBalanceCentavos, 0);

  const rows: TExplainRow[] = isNet
    ? [
        {
          label: 'Income you earned',
          centavos: summary.incomeCentavos,
          op: '+',
        },
        {
          label: 'Money you spent',
          centavos: summary.spendingCentavos,
          op: '-',
        },
        {
          label: 'Money you set aside in funds',
          centavos: summary.savedCentavos,
          op: '-',
        },
        {
          label:
            summary.businessNetCentavos < 0
              ? 'What your businesses spent'
              : 'What your businesses made',
          centavos: Math.abs(summary.businessNetCentavos),
          op: summary.businessNetCentavos < 0 ? '-' : '+',
        },
        { label: 'Net this period', centavos: summary.netCentavos, op: '=' },
      ]
    : [
        {
          label: 'All your accounts, credit cards excluded',
          centavos: accountsTotal,
          op: '+',
        },
        {
          label: 'Money that belongs to your businesses',
          centavos: accountsTotal - summary.disposableCentavos,
          op: '-',
        },
        {
          label: 'Disposable money',
          centavos: summary.disposableCentavos,
          op: '=',
        },
      ];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNet
              ? 'How net this period is worked out'
              : 'How disposable money is worked out'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-text-muted">
          {isNet
            ? `Of what you earned in ${summary.label}, this is what is left after spending, after moving money into funds, and after what your businesses took in or spent. It covers this period only.`
            : 'What is actually in your accounts right now, whenever it arrived. Credit cards are left out because their balance is what you owe.'}
        </p>

        <dl className="flex flex-col">
          {rows.map((r) => (
            <div
              key={r.label}
              className={cn(
                'flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0',
                r.op === '=' && 'mt-1 border-t border-b-0 pt-3 font-semibold',
              )}
            >
              <dt className={r.op === '=' ? '' : 'text-text-muted'}>
                <span className="mr-1.5 inline-block w-3 text-text-faint">
                  {r.op === '=' ? '' : r.op}
                </span>
                {r.label}
              </dt>
              <dd className="tnum">{formatPeso(r.centavos)}</dd>
            </div>
          ))}
        </dl>

        {/* These two get mistaken for each other constantly, so each says what
            it is NOT. Time versus place is the whole difference. */}
        <p className="rounded-md bg-muted px-3 py-2 text-xs">
          {isNet ? (
            <>
              Not the same as <strong>Disposable money</strong>. Net is about{' '}
              <strong>time</strong> — only {summary.label}. Disposable is about{' '}
              <strong>place</strong> — what sits in your accounts today,
              whenever it arrived.
            </>
          ) : (
            <>
              Not the same as <strong>Net this period</strong>. Disposable is
              about <strong>place</strong> — your accounts right now. Net is
              about <strong>time</strong> — only what happened in{' '}
              {summary.label}.
            </>
          )}
        </p>

        <p className="text-2xs text-text-muted">
          {isNet
            ? 'Your businesses are included, because they spend from these same accounts. Over all time this figure equals the money actually in your accounts.'
            : 'A business keeps its own money, so whatever its books say it holds comes off the top — otherwise it would look like yours to spend.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Tile({
  label,
  centavos,
  raw,
  tone,
  warn,
  hint,
  hintTone,
  className,
}: {
  label: string;
  centavos?: number;
  raw?: string;
  tone?: 'income' | 'expense';
  warn?: boolean;
  hint?: string;
  hintTone?: 'good' | 'bad';
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-3.5 shadow-sm', className)}>
      <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1">
        {raw !== undefined ? (
          <span
            className={
              warn ? 'text-xl font-bold text-warn' : 'text-xl font-bold'
            }
          >
            {raw}
          </span>
        ) : (
          <AmountText
            centavos={centavos ?? 0}
            kind={tone ?? 'plain'}
            size="lg"
            rounded
          />
        )}
        {hint ? (
          <span
            className={cn(
              'mt-0.5 block text-2xs font-semibold',
              hintTone === 'good'
                ? 'text-ink-income'
                : hintTone === 'bad'
                  ? 'text-ink-expense'
                  : 'text-warn',
            )}
          >
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full lg:col-span-2" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

const DUE_LIMIT = 8;

/**
 * What is still owed, itemised — the question the "Pending installments: 3"
 * tile raises but cannot answer.
 *
 * Recurring rules are absent on purpose: a rule writes its transaction on its
 * date without asking, so it has no unpaid state to report. Listing scheduled
 * charges here would mix "you owe this" with "this will happen".
 */
function DueList({ items }: { items: TDueItem[] }) {
  const navigate = useNavigate();
  const shown = items.slice(0, DUE_LIMIT);
  const overdueCount = items.filter((i) => i.status === 'overdue').length;

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-bold">Due &amp; unpaid</h2>
        {overdueCount > 0 ? (
          <span className="text-2xs font-bold text-danger uppercase">
            {overdueCount} overdue
          </span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">
          Nothing outstanding. Every installment and loan is settled.
        </p>
      ) : (
        <ul>
          {shown.map((item) => (
            <li
              key={`${item.kind}-${item.id}-${item.dueDate ?? 'none'}`}
              className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {item.name}
                </span>
                <span className="truncate text-xs text-text-muted">
                  {item.detail ? `${item.detail} · ` : ''}
                  <DueWhen item={item} />
                </span>
              </span>

              <AmountText centavos={item.amountCentavos} kind="expense" />

              <Button
                variant="ghost"
                size="sm"
                aria-label={`Open ${item.name}`}
                onClick={() =>
                  void navigate(
                    item.kind === 'loan' ? '/credit-loans' : '/installments',
                  )
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items.length > DUE_LIMIT ? (
        <p className="border-t px-4 py-2 text-xs text-text-muted">
          and {items.length - DUE_LIMIT} more
        </p>
      ) : null}
    </section>
  );
}

/** Words, not a bare date — "3 days late" is read faster than "Aug 27, 2026". */
function DueWhen({ item }: { item: TDueItem }) {
  if (item.status === 'undated') {
    return <span>no due date</span>;
  }
  const days = item.daysUntil ?? 0;
  if (days < 0) {
    return (
      <span className="font-semibold text-danger">
        {-days === 1 ? '1 day late' : `${-days} days late`}
      </span>
    );
  }
  if (days === 0) return <span className="font-semibold text-warn">today</span>;
  if (days === 1) return <span className="text-warn">tomorrow</span>;
  return <span>in {days} days</span>;
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import {
  AmountText,
  ChartFrame,
  ErrorState,
  Meter,
  RankedBarList,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
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
import type { TDashboardSummary, TPeriod } from './_types';

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

  const d = data?.result;

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
          {/* Exactly ONE hero figure per view. Proportional figures, not
              tabular — tabular gives every digit a zero's width and makes a big
              number look loose. */}
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-text-muted uppercase">
              Net this period
            </p>
            <AmountText centavos={d.netCentavos} kind="net" size="hero" />
            <p className="mt-1 text-sm text-text-muted">
              for {d.label} · all-time net{' '}
              {formatPeso0(d.netBalanceAllTimeCentavos)}
            </p>
          </section>

          {/* Spending and Saved are separate on purpose: money in a fund is
              money you still have, and adding it to groceries would make the
              expense figure mean nothing. income − spending − saved = net. */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
                Disposable money
              </dt>
              <dd className="mt-1">
                <AmountText
                  centavos={d.disposableCentavos}
                  kind="net"
                  size="lg"
                />
                <span className="mt-0.5 block text-2xs text-text-muted">
                  across your accounts, ready to spend
                </span>
              </dd>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
                Invested money
              </dt>
              <dd className="mt-1">
                <AmountText centavos={d.investedCentavos} size="lg" />
                <span className="mt-0.5 block text-2xs text-text-muted">
                  set aside in funds ·{' '}
                  {formatPeso0(d.disposableCentavos + d.investedCentavos)} all
                  in
                </span>
                {d.investments.totalGainCentavos !== null ? (
                  <span
                    className={cn(
                      'mt-0.5 block text-2xs font-semibold',
                      d.investments.totalGainCentavos >= 0
                        ? 'text-ink-income'
                        : 'text-ink-expense',
                    )}
                  >
                    {d.investments.totalGainCentavos >= 0 ? '+' : '−'}
                    {formatPeso0(Math.abs(d.investments.totalGainCentavos))} vs
                    cost
                  </span>
                ) : null}
              </dd>
            </div>
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

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPeso, formatPesoCompact, type TCentavos } from '@/lib/money';

export type IncomeExpenseDatum = {
  label: string;
  income: TCentavos;
  expense: TCentavos;
};

export type IncomeExpenseChartProps = {
  data: IncomeExpenseDatum[];
  height?: number;
  /** Clicking a group drills into the transactions list for that range. */
  onBarClick?: (index: number) => void;
};

/**
 * Grouped income-vs-expense bars.
 *
 * The ONE place recharts is used. It sits behind this library-agnostic prop so
 * swapping the internals later is a single-file change with no call-site churn.
 *
 * recharts wants literal colour strings on fill, so the CSS-variable tokens are
 * read out of computed style once here rather than at every call site — that
 * also keeps dark mode from becoming a second source of truth.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function IncomeExpenseChart({
  data,
  height = 260,
  onBarClick,
}: IncomeExpenseChartProps) {
  // Read on every render rather than memoising on [] so a theme toggle picks up
  // the new values. Cheap: two getPropertyValue calls.
  const incomeColor = readToken('--chart-income', '#1f8a5b');
  const expenseColor = readToken('--chart-expense', '#dc2626');
  const gridColor = readToken('--border', '#e8ecf2');
  const mutedColor = readToken('--text-muted', '#64748b');

  const lastIndex = data.length - 1;

  const allZero = useMemo(
    () => data.every((d) => d.income === 0 && d.expense === 0),
    [data],
  );

  /**
   * Only set a domain when there is nothing to scale against; otherwise let
   * recharts compute it. Spread conditionally rather than passing
   * `domain={undefined}`, which recharts treats differently from an absent prop.
   */
  const domainProp = allZero
    ? ({ domain: [0, 100] } as const)
    : ({} as Record<string, never>);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
          barGap={2}
          onClick={(state) => {
            // recharts v3 types this as number | TooltipIndex | null.
            const i = state.activeTooltipIndex;
            if (onBarClick && typeof i === 'number') onBarClick(i);
          }}
        >
          {/* Four hairline SOLID gridlines. Never dashed — dashing reads as
              "projection" or "threshold". */}
          <CartesianGrid
            vertical={false}
            stroke={gridColor}
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            // Axis text is muted, never the series colour.
            tick={{ fill: mutedColor, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: mutedColor, fontSize: 11 }}
            width={56}
            tickFormatter={(v: number) => formatPesoCompact(v)}
            {...domainProp}
          />
          <Tooltip
            cursor={{ fill: gridColor, opacity: 0.35 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const income = Number(payload[0]?.value ?? 0);
              const expense = Number(payload[1]?.value ?? 0);
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 font-bold">{String(label)}</p>
                  <p className="text-ink-income">Income {formatPeso(income)}</p>
                  <p className="text-ink-expense">
                    Expense {formatPeso(expense)}
                  </p>
                  <p className="mt-1 border-t pt-1 text-text-muted">
                    Net {formatPeso(income - expense)}
                  </p>
                </div>
              );
            }}
          />
          {/* maxBarSize caps the bar and lets leftover band space be air rather
              than fattening the bars. 4px rounded top, square bottom. */}
          <Bar
            dataKey="income"
            fill={incomeColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            // Animation OFF deliberately. recharts restarts the bar-growth
            // enter animation whenever `data` changes identity, and a parent
            // re-render (a react-query refetch, a theme toggle) hands it a
            // freshly-mapped array. The animation then never finishes and the
            // bars sit at a few pixels tall while the axis still looks correct —
            // a silently wrong chart. Static bars are also simply better here.
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fillOpacity={i === lastIndex ? 1 : 0.88}
                cursor={onBarClick ? 'pointer' : undefined}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expense"
            fill={expenseColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            // Animation OFF deliberately. recharts restarts the bar-growth
            // enter animation whenever `data` changes identity, and a parent
            // re-render (a react-query refetch, a theme toggle) hands it a
            // freshly-mapped array. The animation then never finishes and the
            // bars sit at a few pixels tall while the axis still looks correct —
            // a silently wrong chart. Static bars are also simply better here.
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fillOpacity={i === lastIndex ? 1 : 0.88}
                cursor={onBarClick ? 'pointer' : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

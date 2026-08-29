import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, TriangleAlert } from 'lucide-react';
import { ErrorState, Meter, MoneyInput } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useGet, useMutate } from '@/lib/api';
import { BUDGETS_KEY, DASHBOARD_KEY, toKeyPart } from '@/lib/queryKeys';
import { addMonthsToKey, currentMonthKey, formatMonthKey } from '@/lib/date';
import { centavosToInputString, formatPeso, parsePesoInput } from '@/lib/money';
import type { TBudget, TBudgetsResult } from './_types';

export default function BudgetsPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [editing, setEditing] = useState<TBudget | null>(null);

  const { data, isPending, isError, refetch } = useGet<TBudgetsResult>({
    url: '/api/v1/budgets',
    key: [BUDGETS_KEY, toKeyPart(monthKey)],
    params: { month: monthKey },
  });

  const b = data?.result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthKey((m) => addMonthsToKey(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-40 px-1 text-center font-bold sm:min-w-48">
          {formatMonthKey(monthKey)}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthKey((m) => addMonthsToKey(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonthKey(currentMonthKey())}
          disabled={monthKey === currentMonthKey()}
        >
          This month
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load budgets"
          retry={() => void refetch()}
        />
      ) : isPending && !b ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : b ? (
        <>
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">Overall</h3>
              <span className="tnum text-sm">
                {formatPeso(b.totals.spentCentavos)} of{' '}
                {formatPeso(b.totals.capCentavos)}
              </span>
            </div>
            <Meter
              percent={
                b.totals.capCentavos === 0
                  ? 0
                  : Math.round(
                      (b.totals.spentCentavos / b.totals.capCentavos) * 100,
                    )
              }
              tone={b.totals.isOverBudget ? 'danger' : 'neutral'}
              label="Overall budget"
            />
            <p className="mt-2 text-sm text-text-muted">
              {b.totals.isOverBudget
                ? `Over by ${formatPeso(b.totals.spentCentavos - b.totals.capCentavos)}`
                : `${formatPeso(b.totals.remainingCentavos)} left`}
            </p>
          </section>

          {b.budgeted.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {b.budgeted.map((row) => (
                <BudgetRow
                  key={row.categoryId}
                  budget={row}
                  onEdit={() => setEditing(row)}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-text-muted">
              No caps set for this month yet.
            </p>
          )}

          {b.unbudgeted.length > 0 ? (
            <section>
              <h3 className="mb-2 text-sm font-bold text-text-muted">
                No cap set
              </h3>
              {/* Without this list, discovering that a category has no budget
                  would require knowing what's missing. */}
              <ul className="flex flex-wrap gap-2">
                {b.unbudgeted.map((row) => (
                  <li key={row.categoryId}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(row)}
                    >
                      <CategoryIcon
                        name={row.icon}
                        color={row.color}
                        size="sm"
                      />
                      {row.name}
                      <Plus className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {editing ? (
        <CapDialog
          budget={editing}
          monthKey={monthKey}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function BudgetRow({
  budget,
  onEdit,
}: {
  budget: TBudget;
  onEdit: () => void;
}) {
  const cap = budget.capCentavos ?? 0;
  const over = budget.isOverBudget;

  return (
    <li
      className={
        over
          ? 'rounded-lg border border-danger bg-danger-tint p-3.5'
          : 'rounded-lg border bg-card p-3.5'
      }
    >
      <div className="mb-2 flex items-center gap-2.5">
        <CategoryIcon name={budget.icon} color={budget.color} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
            {/* Icon + label on the over-budget state, never colour alone. */}
            {over ? <TriangleAlert className="size-3.5 text-danger" /> : null}
            {budget.name}
            {budget.capSource === 'override' ? (
              <span className="text-2xs text-text-faint">this month only</span>
            ) : null}
          </span>
          <span className="tnum text-xs text-text-muted">
            {formatPeso(budget.spentCentavos)} of {formatPeso(cap)}
          </span>
        </span>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>

      <Meter
        percent={budget.percentUsed}
        tone={over ? 'danger' : budget.isNearLimit ? 'warn' : 'neutral'}
        label={`${budget.name} budget`}
      />

      <p
        className={
          over
            ? 'mt-1.5 text-xs font-semibold text-danger'
            : budget.isNearLimit
              ? 'mt-1.5 text-xs font-semibold text-warn'
              : 'mt-1.5 text-xs text-text-muted'
        }
      >
        {over
          ? `Over by ${formatPeso(budget.spentCentavos - cap)}`
          : `${formatPeso(budget.remainingCentavos ?? 0)} left`}
      </p>
    </li>
  );
}

function CapDialog({
  budget,
  monthKey,
  onClose,
}: {
  budget: TBudget;
  monthKey: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(
    budget.capCentavos !== null
      ? centavosToInputString(budget.capCentavos)
      : '',
  );
  const [thisMonthOnly, setThisMonthOnly] = useState(
    budget.capSource === 'override',
  );

  const invalidations = [[BUDGETS_KEY], [DASHBOARD_KEY]];

  const setDefault = useMutate<{ capCentavos: number | null }, unknown>({
    url: `/api/v1/budgets/default/${budget.categoryId}`,
    method: 'put',
    invalidateKeys: invalidations,
  });

  const setOverride = useMutate<
    { categoryId: string; month: string; capCentavos: number },
    unknown
  >({
    url: '/api/v1/budgets/override',
    method: 'put',
    invalidateKeys: invalidations,
  });

  async function handleSave() {
    const centavos = value ? parsePesoInput(value) : null;

    if (thisMonthOnly) {
      if (centavos === null) return;
      await setOverride.mutateAsync({
        categoryId: budget.categoryId,
        month: monthKey,
        capCentavos: centavos,
      });
      toast.success(`Cap set for ${formatMonthKey(monthKey)}`);
    } else {
      await setDefault.mutateAsync({ capCentavos: centavos });
      toast.success(
        centavos === null ? 'Cap removed' : 'Cap set for every month',
      );
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Budget for {budget.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cap">Monthly cap</Label>
            <MoneyInput id="cap" value={value} onChange={setValue} autoFocus />
            <p className="text-xs text-muted-foreground">
              Leave blank to remove the cap.
            </p>
          </div>

          <Label className="flex items-start gap-2.5 rounded-md border p-3 font-normal">
            <Checkbox
              checked={thisMonthOnly}
              onCheckedChange={(next) => setThisMonthOnly(next === true)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                Only for {formatMonthKey(monthKey)}
              </span>
              <span className="text-xs text-muted-foreground">
                Off means this becomes the default cap, carried forward until
                you change it.
              </span>
            </span>
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={setDefault.isPending || setOverride.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, TriangleAlert } from 'lucide-react';
import {
  AmountText,
  EmptyState,
  ErrorState,
  Meter,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDisplayDate } from '@/lib/date';
import { formatPeso } from '@/lib/money';
import { InstallmentForm } from './_form/InstallmentForm';
import {
  useCreateInstallmentPlan,
  useInstallmentPlans,
  useInstallmentSummary,
} from './_hooks/api';
import { generateSchedule } from './_schedule';
import type { TPlan, TPlanFormValues } from './_types';
import { parsePesoInput } from '@/lib/money';

export default function InstallmentsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'active' | 'completed' | 'all'>(
    'active',
  );
  const [creating, setCreating] = useState(false);

  const { data, isPending, isError, refetch } = useInstallmentPlans(status);
  const { data: summaryData } = useInstallmentSummary();
  const create = useCreateInstallmentPlan();

  const plans = data?.result ?? [];
  const summary = summaryData?.result;

  async function handleCreate(values: TPlanFormValues) {
    const totalCentavos = parsePesoInput(values.total);
    if (totalCentavos === null) return;

    const termMonths = Number(values.termMonths);
    const dayOfMonth = Number(values.dayOfMonth);

    // Compare against the local preview. Two implementations of one algorithm
    // WILL drift eventually; this surfaces it immediately rather than in six
    // months.
    const previewed = generateSchedule({
      totalCentavos,
      termMonths,
      startDate: values.startDate,
      dayOfMonth,
    });

    const saved = await create.mutateAsync({
      name: values.name,
      merchant: values.merchant?.trim() ? values.merchant.trim() : null,
      totalCentavos,
      termMonths,
      startDate: values.startDate,
      dayOfMonth,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    });

    const savedTotal = saved.payments.reduce((a, p) => a + p.amountCentavos, 0);
    if (
      saved.payments.length !== previewed.length ||
      savedTotal !== totalCentavos
    ) {
      toast.warning('Saved schedule differs from the preview', {
        description: `Preview: ${previewed.length} payments / ${formatPeso(totalCentavos)}. Saved: ${saved.payments.length} / ${formatPeso(savedTotal)}.`,
      });
    } else {
      toast.success('Installment plan created');
    }

    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <TabsList aria-label="Plan status">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New plan
        </Button>
      </div>

      {summary ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Active plans"
            value={String(summary.activePlanCount)}
          />
          <SummaryTile
            label="Pending payments"
            value={String(summary.pendingCount)}
          />
          <SummaryTile
            label="Overdue"
            value={String(summary.overdueCount)}
            danger={summary.overdueCount > 0}
          />
          <SummaryTile
            label="Remaining"
            value={formatPeso(summary.totalRemainingCentavos)}
          />
        </dl>
      ) : null}

      {isError ? (
        <ErrorState title="Could not load plans" retry={() => void refetch()} />
      ) : isPending && plans.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No installment plans"
          description="Track a purchase you're paying off over several months."
          action={{ label: 'New plan', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onOpen={() => void navigate(`/installments/${plan.id}`)}
            />
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New installment plan</DialogTitle>
          </DialogHeader>
          <InstallmentForm
            mode="create"
            loading={create.isPending}
            onSubmit={(v) => void handleCreate(v)}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3.5 shadow-sm">
      <dt className="text-2xs font-bold tracking-wide text-text-muted uppercase">
        {label}
      </dt>
      <dd
        className={
          danger
            ? 'tnum mt-1 text-xl font-bold text-danger'
            : 'tnum mt-1 text-xl font-bold'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function PlanCard({ plan, onOpen }: { plan: TPlan; onOpen: () => void }) {
  const isOverdue = plan.overdueCount > 0;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-border-strong"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{plan.name}</p>
            {plan.merchant ? (
              <p className="truncate text-xs text-text-muted">
                {plan.merchant}
              </p>
            ) : null}
          </div>
          {/* Icon + label, never colour alone. */}
          {isOverdue ? (
            <Badge
              variant="outline"
              className="border-danger/30 bg-danger-tint text-danger"
            >
              <TriangleAlert />
              {plan.overdueCount} overdue
            </Badge>
          ) : plan.isCompleted ? (
            <Badge
              variant="outline"
              className="border-good/30 bg-good-tint text-good"
            >
              Completed
            </Badge>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="tnum">
              {formatPeso(plan.paidCentavos)} of{' '}
              {formatPeso(plan.totalCentavos)}
            </span>
            <span className="text-text-muted">
              {plan.paidCount} / {plan.termMonths} paid
            </span>
          </div>
          <Meter
            percent={plan.percentPaid}
            tone={isOverdue ? 'danger' : 'income'}
            label={`${plan.name} progress`}
          />
        </div>

        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-text-muted">
            {plan.nextDueDate
              ? `Next due ${formatDisplayDate(plan.nextDueDate)}`
              : 'All payments made'}
          </span>
          <AmountText centavos={plan.remainingCentavos} size="sm" />
        </div>
      </button>
    </li>
  );
}

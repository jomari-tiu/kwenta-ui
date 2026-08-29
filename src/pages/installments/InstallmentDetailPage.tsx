import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, Trash2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AmountText,
  ConfirmDialog,
  ErrorState,
  Meter,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatDisplayDate } from '@/lib/date';
import { formatPeso } from '@/lib/money';
import {
  useDeleteInstallmentPlan,
  useInstallmentPlan,
  useMarkInstallmentPaid,
  useUnmarkInstallmentPaid,
} from './_hooks/api';
import type { TPayment } from './_types';

export default function InstallmentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const { data, isPending, isError, refetch } = useInstallmentPlan(id);
  const del = useDeleteInstallmentPlan(id);

  const plan = data?.result;

  async function handleDelete() {
    const res = await del.mutateAsync();
    toast.success(
      res.deletedTransactionCount > 0
        ? `Plan deleted. ${res.deletedTransactionCount} expense(s) kept.`
        : 'Plan deleted. Any expenses it created were kept.',
    );
    setDeleting(false);
    void navigate('/installments', { replace: true });
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load this plan"
        retry={() => void refetch()}
      />
    );
  }

  if (isPending && !plan) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate('/installments')}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleting(true)}
          className="ml-auto"
        >
          <Trash2 className="size-4 text-destructive" />
          Delete
        </Button>
      </div>

      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{plan.name}</h2>
            {plan.merchant ? (
              <p className="text-sm text-text-muted">{plan.merchant}</p>
            ) : null}
          </div>
          {plan.overdueCount > 0 ? (
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
              <CircleCheck />
              Completed
            </Badge>
          ) : null}
        </div>

        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="tnum">
            {formatPeso(plan.paidCentavos)} of {formatPeso(plan.totalCentavos)}
          </span>
          <span className="text-text-muted">
            {plan.paidCount} of {plan.termMonths} paid ·{' '}
            {formatPeso(plan.remainingCentavos)} remaining
          </span>
        </div>
        <Meter
          percent={plan.percentPaid}
          tone={plan.overdueCount > 0 ? 'danger' : 'income'}
          label="Plan progress"
        />
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b bg-surface-2 px-4 py-2.5">
          <h3 className="text-sm font-bold">Payments</h3>
        </div>
        <ul className="divide-y">
          {plan.payments.map((p) => (
            <PaymentRow key={p.id} planId={plan.id} payment={p} />
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => void handleDelete()}
        title="Delete this plan?"
        description="The scheduled payments go away. Expenses already recorded from paid payments are KEPT — that was real money leaving your account."
        confirmLabel="Delete plan"
        tone="danger"
        loading={del.isPending}
      />
    </div>
  );
}

function PaymentRow({
  planId,
  payment,
}: {
  planId: string;
  payment: TPayment;
}) {
  const [unpayOpen, setUnpayOpen] = useState(false);
  const pay = useMarkInstallmentPaid(planId);
  const unpay = useUnmarkInstallmentPaid(planId);

  const isOverdue = payment.derivedStatus === 'overdue';
  const isPaid = payment.status === 'paid';

  async function handlePay() {
    await pay.mutateAsync({ paymentId: payment.id });
    toast.success(
      `Marked paid · ${formatPeso(payment.amountCentavos)} expense added`,
    );
  }

  async function handleUnpay() {
    await unpay.mutateAsync({ paymentId: payment.id });
    toast.success('Unmarked — the linked expense was removed');
    setUnpayOpen(false);
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-3 px-4 py-3',
        isOverdue && 'bg-danger-tint',
      )}
    >
      <span className="tabular-nums w-6 shrink-0 text-sm text-text-muted">
        {payment.sequenceNo}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {formatDisplayDate(payment.dueDate)}
        </span>
        <span className="text-xs text-text-muted">
          {isPaid && payment.paidDate
            ? `Paid ${formatDisplayDate(payment.paidDate)}`
            : payment.derivedStatus === 'dueSoon'
              ? 'Due soon'
              : isOverdue
                ? 'Overdue'
                : 'Scheduled'}
        </span>
      </span>

      <AmountText centavos={payment.amountCentavos} />

      <StatusBadge status={payment.derivedStatus} />

      {isPaid ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUnpayOpen(true)}
          disabled={unpay.isPending}
        >
          Unmark
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => void handlePay()}
          disabled={pay.isPending}
        >
          Mark paid
        </Button>
      )}

      <ConfirmDialog
        open={unpayOpen}
        onClose={() => setUnpayOpen(false)}
        onConfirm={() => void handleUnpay()}
        title="Unmark this payment?"
        description="The expense this created will be deleted. Any manual edit to its amount will be lost."
        confirmLabel="Unmark"
        tone="danger"
        loading={unpay.isPending}
      />
    </li>
  );
}

function StatusBadge({ status }: { status: TPayment['derivedStatus'] }) {
  if (status === 'paid') {
    return (
      <Badge
        variant="outline"
        className="border-good/30 bg-good-tint text-good"
      >
        <CircleCheck />
        Paid
      </Badge>
    );
  }
  if (status === 'overdue') {
    return (
      <Badge
        variant="outline"
        className="border-danger/30 bg-danger-tint text-danger"
      >
        <TriangleAlert />
        Overdue
      </Badge>
    );
  }
  if (status === 'dueSoon')
    return (
      <Badge
        variant="outline"
        className="border-warn/30 bg-warn-tint text-warn"
      >
        Due soon
      </Badge>
    );
  return <Badge variant="secondary">Scheduled</Badge>;
}

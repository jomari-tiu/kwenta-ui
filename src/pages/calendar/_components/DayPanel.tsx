import { useState } from 'react';
import {
  CircleCheck,
  HandCoins,
  Pencil,
  PiggyBank,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AmountText, ConfirmDialog, EmptyState } from '@/components/finance';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatDisplayDate, formatWeekday } from '@/lib/date';
import { formatPeso } from '@/lib/money';
import { useDeleteTransaction } from '@/pages/transactions/_hooks/api';
import {
  useMarkInstallmentPaid,
  useUnmarkInstallmentPaid,
} from '@/pages/installments/_hooks/api';
import type { TTransaction } from '@/pages/transactions/_types';
import type {
  TCalendarDay,
  TCalendarDue,
  TCalendarFundTarget,
  TCalendarLoanDue,
} from '../_types';
import { QuickEntryForm } from './QuickEntryForm';

export type DayPanelProps = {
  day: TCalendarDay | null;
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
  onEditTransaction: (txn: TTransaction) => void;
};

export function DayPanel({
  day,
  open,
  isMobile,
  onClose,
  onEditTransaction,
}: DayPanelProps) {
  if (!day) return null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Bottom sheet on a phone, side panel on desktop. */}
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md'
        }
      >
        <SheetHeader>
          <SheetTitle>{formatDisplayDate(day.date)}</SheetTitle>
          <SheetDescription>{formatWeekday(day.date)}</SheetDescription>
        </SheetHeader>

        {/* overscroll-contain stops the sheet rubber-banding the page on iOS. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {/* The day's net lives in the HEADER area, not a sticky footer — a footer
          is covered by the mobile keyboard. */}
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b pb-3">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Net
            </span>
            <AmountText centavos={day.netCentavos} kind="net" size="lg" />
          </div>

          <QuickEntryForm date={day.date} />

          {day.dues.length > 0 ? (
            <section className="mt-5">
              <SectionLabel>Installment dues</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {day.dues.map((due) => (
                  <DueRow key={due.id} due={due} />
                ))}
              </ul>
            </section>
          ) : null}

          {day.loanDues.length > 0 ? (
            <section className="mt-5">
              <SectionLabel>Credit loans due</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {day.loanDues.map((loan) => (
                  <LoanDueRow key={loan.id} loan={loan} />
                ))}
              </ul>
            </section>
          ) : null}

          {day.fundTargets.length > 0 ? (
            <section className="mt-5">
              <SectionLabel>Savings goals</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {day.fundTargets.map((t) => (
                  <FundTargetRow key={t.id} target={t} />
                ))}
              </ul>
            </section>
          ) : null}

          {day.projections.length > 0 ? (
            <section className="mt-5">
              <SectionLabel>Scheduled (not yet recorded)</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {day.projections.map((p) => (
                  <li
                    key={`${p.ruleId}-${p.date}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Repeat className="size-4 shrink-0 text-muted-foreground/70" />
                      <span className="truncate text-sm text-muted-foreground">
                        {p.ruleName}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-sm text-muted-foreground">
                      {formatPeso(p.amountCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <DayEntries day={day} onEditTransaction={onEditTransaction} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function DayEntries({
  day,
  onEditTransaction,
}: {
  day: TCalendarDay;
  onEditTransaction: (txn: TTransaction) => void;
}) {
  // Entries created by marking a due paid are ALREADY shown in the dues
  // section, merged with their due. Rendering them again would show the same
  // money twice.
  const linkedIds = new Set(
    day.dues.map((d) => d.transactionId).filter((v): v is string => v !== null),
  );
  const entries = day.entries.filter((e) => !linkedIds.has(e.id));

  const income = entries.filter((e) => e.type === 'income');
  const expense = entries.filter((e) => e.type === 'expense');

  if (
    entries.length === 0 &&
    day.dues.length === 0 &&
    day.loanDues.length === 0 &&
    day.fundTargets.length === 0
  ) {
    return (
      <div className="mt-4">
        <EmptyState
          title="Nothing logged"
          description={`No income or expenses on ${formatDisplayDate(day.date)}.`}
          icon={<Plus className="size-6" />}
        />
      </div>
    );
  }

  return (
    <>
      {income.length > 0 ? (
        <section className="mt-5">
          <SectionLabel>Income</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {income.map((e) => (
              <EntryRow key={e.id} txn={e} onEdit={onEditTransaction} />
            ))}
          </ul>
        </section>
      ) : null}

      {expense.length > 0 ? (
        <section className="mt-5">
          <SectionLabel>Expenses</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {expense.map((e) => (
              <EntryRow key={e.id} txn={e} onEdit={onEditTransaction} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function EntryRow({
  txn,
  onEdit,
}: {
  txn: TTransaction;
  onEdit: (txn: TTransaction) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteTransaction(txn.id);

  async function handleDelete() {
    await del.mutateAsync();
    toast.success('Transaction deleted');
    setConfirming(false);
  }

  return (
    <li className="group flex items-center gap-2.5 rounded-md border px-3 py-2.5">
      <CategoryIcon name={txn.category.icon} color={txn.category.color} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {txn.category.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {txn.note ? `${txn.note} · ` : ''}
          {txn.account.name}
          {txn.source === 'recurring' ? ' · recurring' : ''}
        </span>
      </span>

      <AmountText centavos={txn.amountCentavos} kind={txn.type} />

      <span className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(txn)}
          aria-label="Edit"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
          aria-label="Delete"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </span>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title="Delete this transaction?"
        description={`${txn.category.name} · ${formatPeso(txn.amountCentavos)}`}
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

/**
 * ONE row per due, merged with the expense it generated. Never a due row plus a
 * separate transaction row for the same money.
 */
function DueRow({ due }: { due: TCalendarDue }) {
  const [unpayOpen, setUnpayOpen] = useState(false);
  const pay = useMarkInstallmentPaid(due.planId);
  const unpay = useUnmarkInstallmentPaid(due.planId);

  const isOverdue = due.derivedStatus === 'overdue';
  const isPaid = due.status === 'paid';

  async function handlePay() {
    await pay.mutateAsync({ paymentId: due.id });
    toast.success(
      `Marked paid · ${formatPeso(due.amountCentavos)} expense added`,
    );
  }

  async function handleUnpay() {
    await unpay.mutateAsync({ paymentId: due.id });
    toast.success('Payment unmarked — the linked expense was removed');
    setUnpayOpen(false);
  }

  return (
    <li
      className={cn(
        // Two stacked rows rather than one line: the plan name is the thing you
        // need to read, and competing with a badge, an amount and a button on
        // one line truncated it to "Leno...".
        'flex flex-col gap-2 rounded-md border px-3 py-2.5',
        isOverdue && 'border-danger bg-danger-tint',
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{due.planName}</span>
          <span className="text-xs text-muted-foreground">
            Payment {due.sequenceNo} of {due.termMonths}
          </span>
        </span>
        {/* Icon + label, never colour alone. */}
        {isOverdue ? (
          <Badge
            variant="outline"
            className="border-danger/30 bg-danger-tint text-danger"
          >
            <TriangleAlert />
            Overdue
          </Badge>
        ) : isPaid ? (
          <Badge
            variant="outline"
            className="border-good/30 bg-good-tint text-good"
          >
            <CircleCheck />
            Paid
          </Badge>
        ) : null}
      </span>

      <span className="flex items-center justify-between gap-2">
        <AmountText centavos={due.amountCentavos} kind="expense" />

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
      </span>

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

/**
 * A loan due is informational — repayments are recorded on the loan itself,
 * where the outstanding balance is visible. So this row links there rather than
 * offering a one-tap "paid" that could over-pay the loan.
 */
function LoanDueRow({ loan }: { loan: TCalendarLoanDue }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-md border px-3 py-2.5',
        loan.isOverdue && 'border-danger bg-danger-tint',
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{loan.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {loan.lender ?? 'Credit loan'}
          </span>
        </span>
        {loan.isOverdue ? (
          <Badge
            variant="outline"
            className="border-danger/30 bg-danger-tint text-danger"
          >
            <TriangleAlert />
            Overdue
          </Badge>
        ) : (
          <Badge variant="secondary">
            <HandCoins />
            Due
          </Badge>
        )}
      </span>

      <span className="flex items-center justify-between gap-2">
        <AmountText centavos={loan.outstandingCentavos} kind="expense" />
        <Link
          to="/credit-loans"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Open loan
        </Link>
      </span>
    </li>
  );
}

/**
 * A goal date, styled deliberately UNLIKE a due: no red, no "overdue". Missing
 * a savings target is not being late on a debt, and painting it the same colour
 * would teach you to ignore the colour that means you actually owe someone.
 */
function FundTargetRow({ target }: { target: TCalendarFundTarget }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-dashed px-3 py-2.5">
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{target.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {target.provider ?? 'Savings goal'}
          </span>
        </span>
        {target.isReached ? (
          <Badge
            variant="outline"
            className="border-good/30 bg-good-tint text-good"
          >
            <CircleCheck />
            Reached
          </Badge>
        ) : (
          <Badge variant="secondary">
            <PiggyBank />
            Goal
          </Badge>
        )}
      </span>

      <span className="tnum flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {formatPeso(target.netContributedCentavos)}
          {target.targetCentavos === null
            ? ''
            : ` of ${formatPeso(target.targetCentavos)}`}
        </span>
        <Link
          to="/investments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Open fund
        </Link>
      </span>
    </li>
  );
}

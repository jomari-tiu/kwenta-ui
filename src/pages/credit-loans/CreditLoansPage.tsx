import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarOff,
  HandCoins,
  History,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useMobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AmountText,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Meter,
  MoneyInput,
} from '@/components/finance';
import { formatDisplayDate, todayPlainDate } from '@/lib/date';
import { centavosToInputString, formatPeso, parsePesoInput } from '@/lib/money';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { useCategories } from '@/pages/categories/_hooks/api';
import {
  useCreateCreditLoan,
  useCreditLoan,
  useDeleteRepayment,
  useCreditLoanSummary,
  useCreditLoans,
  useDeleteCreditLoan,
  useRepayCreditLoan,
  useUpdateCreditLoan,
} from './_hooks/api';
import {
  creditLoanSchema,
  repaySchema,
  type TCreditLoan,
  type TCreditLoanFormValues,
  type TRepayFormValues,
} from './_types';

export default function CreditLoansPage() {
  const [status, setStatus] = useState<'open' | 'settled' | 'all'>('open');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TCreditLoan | null>(null);
  const [repaying, setRepaying] = useState<TCreditLoan | null>(null);
  const [viewing, setViewing] = useState<TCreditLoan | null>(null);

  const { data, isPending, isError, refetch } = useCreditLoans(status);
  const { data: summaryData } = useCreditLoanSummary();

  const loans = data?.result ?? [];
  const summary = summaryData?.result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <TabsList aria-label="Loan status">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="settled">Settled</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New loan
        </Button>
      </div>

      {summary ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Open loans" value={String(summary.openCount)} />
          <Tile
            label="Overdue"
            value={String(summary.overdueCount)}
            danger={summary.overdueCount > 0}
          />
          {/* Surfaced on purpose: an undated loan is easy to forget precisely
              because it never nags you. */}
          <Tile label="No due date" value={String(summary.undatedCount)} />
          <Tile
            label="Outstanding"
            value={formatPeso(summary.totalOutstandingCentavos)}
          />
        </dl>
      ) : null}

      {isError ? (
        <ErrorState title="Could not load loans" retry={() => void refetch()} />
      ) : isPending && loans.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          title={status === 'open' ? 'No open loans' : 'Nothing here'}
          description="Track money you've borrowed. A due date is optional — leave it blank if there's no agreed date."
          icon={<HandCoins className="size-5" />}
          action={{ label: 'New loan', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onEdit={() => setEditing(loan)}
              onRepay={() => setRepaying(loan)}
              onHistory={() => setViewing(loan)}
            />
          ))}
        </ul>
      )}

      <RepaymentHistoryPanel loan={viewing} onClose={() => setViewing(null)} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New credit loan</DialogTitle>
          </DialogHeader>
          <LoanForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {editing ? (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit loan</DialogTitle>
            </DialogHeader>
            <LoanForm existing={editing} onDone={() => setEditing(null)} />
          </DialogContent>
        </Dialog>
      ) : null}

      {repaying ? (
        <Dialog open onOpenChange={(next) => !next && setRepaying(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Record a repayment</DialogTitle>
            </DialogHeader>
            <RepayForm loan={repaying} onDone={() => setRepaying(null)} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function Tile({
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
      <dt className="text-2xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn('tnum mt-1 text-xl font-bold', danger && 'text-danger')}
      >
        {value}
      </dd>
    </div>
  );
}

function LoanCard({
  loan,
  onEdit,
  onRepay,
  onHistory,
}: {
  loan: TCreditLoan;
  onEdit: () => void;
  onRepay: () => void;
  onHistory: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteCreditLoan(loan.id);

  async function handleDelete() {
    const res = await del.mutateAsync();
    toast.success(
      res.keptTransactionCount > 0
        ? `Loan deleted. ${res.keptTransactionCount} repayment(s) kept in your ledger.`
        : 'Loan deleted.',
    );
    setConfirming(false);
  }

  const overdue = loan.status === 'overdue';

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm',
        overdue && 'border-danger bg-danger-tint',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{loan.name}</p>
          {loan.lender ? (
            <p className="truncate text-xs text-muted-foreground">
              {loan.lender}
            </p>
          ) : null}
        </div>
        <StatusBadge status={loan.status} />
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="tnum">
            {formatPeso(loan.repaidCentavos)} of{' '}
            {formatPeso(loan.principalCentavos)}
          </span>
          <span className="text-muted-foreground">
            {loan.percentRepaid}% repaid
          </span>
        </div>
        <Meter
          percent={loan.percentRepaid}
          tone={overdue ? 'danger' : 'income'}
          label={`${loan.name} repayment`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* An undated loan says so plainly rather than showing a blank or a
            made-up date. */}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {loan.dueDate ? (
            <>Due {formatDisplayDate(loan.dueDate)}</>
          ) : (
            <>
              <CalendarOff className="size-3.5" />
              No due date
            </>
          )}
        </span>
        <AmountText centavos={loan.outstandingCentavos} size="sm" />
      </div>

      <div className="flex items-center justify-end gap-1 border-t pt-2">
        {!loan.isSettled ? (
          <Button size="sm" onClick={onRepay}>
            Record payment
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onHistory}
          aria-label="Payment history"
        >
          <History className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
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
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title="Delete this loan?"
        description="Repayments you already recorded stay in your ledger — that was real money leaving your account."
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

function StatusBadge({ status }: { status: TCreditLoan['status'] }) {
  if (status === 'settled') {
    return (
      <Badge
        variant="outline"
        className="border-good/30 bg-good-tint text-good"
      >
        Settled
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
  if (status === 'dueSoon') {
    return (
      <Badge
        variant="outline"
        className="border-warn/30 bg-warn-tint text-warn"
      >
        Due soon
      </Badge>
    );
  }
  return <Badge variant="secondary">Open</Badge>;
}

function LoanForm({
  existing,
  onDone,
}: {
  existing?: TCreditLoan;
  onDone: () => void;
}) {
  const create = useCreateCreditLoan();
  const update = useUpdateCreditLoan(existing?.id ?? '');
  const { data: categoryData } = useCategories({ kind: 'expense' });
  const { data: accountData } = useAccounts();

  const form = useForm<TCreditLoanFormValues>({
    resolver: zodResolver(creditLoanSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          lender: existing.lender ?? '',
          principal: centavosToInputString(existing.principalCentavos),
          dueDate: existing.dueDate ?? '',
          categoryId: existing.categoryId,
          accountId: existing.accountId,
          note: existing.note ?? '',
        }
      : {
          name: '',
          lender: '',
          principal: '',
          dueDate: '',
          categoryId: '',
          accountId: '',
          note: '',
        },
  });

  async function handleSubmit(values: TCreditLoanFormValues) {
    const principalCentavos = parsePesoInput(values.principal);
    if (principalCentavos === null) return;

    const payload = {
      name: values.name,
      lender: values.lender?.trim() ? values.lender.trim() : null,
      principalCentavos,
      // Blank means "no agreed date" — send null, never today's date.
      dueDate: values.dueDate ? values.dueDate : null,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    if (existing) {
      await update.mutateAsync(payload);
      toast.success('Loan updated');
    } else {
      await create.mutateAsync(payload);
      toast.success('Loan added');
    }
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is it?</FormLabel>
              <FormControl>
                <Input placeholder="Utang kay Kuya" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who do you owe?</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="principal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount borrowed</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                Optional. Leave blank if there's no agreed date — the loan will
                never be marked overdue.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category for repayments</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category">
                      {(v) =>
                        (categoryData?.result ?? []).find((c) => c.id === v)
                          ?.name ?? 'Select a category'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(categoryData?.result ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pay from</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an account">
                      {(v) =>
                        (accountData?.result ?? []).find((a) => a.id === v)
                          ?.name ?? 'Select an account'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(accountData?.result ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {existing ? 'Save changes' : 'Add loan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function RepayForm({
  loan,
  onDone,
}: {
  loan: TCreditLoan;
  onDone: () => void;
}) {
  const repay = useRepayCreditLoan(loan.id);

  const form = useForm<TRepayFormValues>({
    resolver: zodResolver(repaySchema),
    defaultValues: { amount: '', paidDate: todayPlainDate(), note: '' },
  });

  async function handleSubmit(values: TRepayFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;

    await repay.mutateAsync({
      amountCentavos,
      paidDate: values.paidDate,
      note: values.note?.trim() ? values.note.trim() : null,
    });
    toast.success(`Recorded · ${formatPeso(amountCentavos)} expense added`);
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Outstanding{' '}
          <span className="tnum font-bold">
            {formatPeso(loan.outstandingCentavos)}
          </span>
        </p>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount paid</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                This records a real expense on the loan's account.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paidDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={repay.isPending}>
            Record payment
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Every repayment recorded against a loan, and the only place one can be
 * removed. The transactions module shows the same rows read-only — one record,
 * one owner.
 */
function RepaymentHistoryPanel({
  loan,
  onClose,
}: {
  loan: TCreditLoan | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const { data, isPending, isError, refetch } = useCreditLoan(loan?.id ?? '');
  const detail = data?.result;
  const repayments = detail?.repayments ?? [];

  return (
    <Sheet open={loan !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md'
        }
      >
        <SheetHeader>
          <SheetTitle>{loan?.name ?? 'Payments'}</SheetTitle>
          <SheetDescription>
            {loan
              ? `${formatPeso(loan.repaidCentavos)} repaid of ${formatPeso(
                  loan.principalCentavos,
                )} · ${formatPeso(loan.outstandingCentavos)} left`
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {isError ? (
            <ErrorState
              title="Could not load payments"
              retry={() => void refetch()}
            />
          ) : isPending && repayments.length === 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : repayments.length === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Record one with the Record payment button."
              icon={<History className="size-5" />}
            />
          ) : (
            <ul className="flex flex-col">
              {repayments.map((r) => (
                <RepaymentRow
                  key={r.id}
                  loanId={loan?.id ?? ''}
                  repayment={r}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RepaymentRow({
  loanId,
  repayment,
}: {
  loanId: string;
  repayment: {
    id: string;
    amountCentavos: number;
    txnDate: string;
    note: string | null;
  };
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteRepayment(loanId);

  async function handleDelete() {
    await del.mutateAsync({ transactionId: repayment.id });
    toast.success('Payment removed — the loan balance went back up');
    setConfirming(false);
  }

  return (
    <li className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {formatDisplayDate(repayment.txnDate)}
        </span>
        {repayment.note ? (
          <span className="truncate text-xs text-muted-foreground">
            {repayment.note}
          </span>
        ) : null}
      </span>

      <AmountText centavos={repayment.amountCentavos} kind="expense" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label="Remove payment"
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title="Remove this payment?"
        description="The expense is deleted from your ledger and the loan's outstanding balance goes back up."
        confirmLabel="Remove"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

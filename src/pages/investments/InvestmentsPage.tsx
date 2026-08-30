import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  History,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  useContribute,
  useCreateInvestment,
  useDeleteFlow,
  useInvestment,
  useDeleteInvestment,
  useInvestmentSummary,
  useInvestments,
  useUpdateInvestment,
  useWithdraw,
} from './_hooks/api';
import {
  contributeSchema,
  investmentSchema,
  INVESTMENT_KINDS,
  KIND_LABELS,
  withdrawSchema,
  type TContributeFormValues,
  type TInvestment,
  type TInvestmentFormValues,
  type TWithdrawFormValues,
} from './_types';

export default function InvestmentsPage() {
  const [status, setStatus] = useState<'active' | 'closed' | 'all'>('active');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TInvestment | null>(null);
  const [adding, setAdding] = useState<TInvestment | null>(null);
  const [taking, setTaking] = useState<TInvestment | null>(null);
  const [viewing, setViewing] = useState<TInvestment | null>(null);

  const { data, isPending, isError, refetch } = useInvestments(status);
  const { data: summaryData } = useInvestmentSummary();

  const funds = data?.result ?? [];
  const summary = summaryData?.result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <TabsList aria-label="Fund status">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New fund
        </Button>
      </div>

      {summary ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Active funds" value={String(summary.activeCount)} />
          <Tile
            label="Total put in"
            value={formatPeso(summary.totalNetContributedCentavos)}
          />
          {/* An em dash, not ₱0.00: nothing valued is not the same as worthless. */}
          <Tile
            label="Current value"
            value={
              summary.totalCurrentValueCentavos === null
                ? '—'
                : formatPeso(summary.totalCurrentValueCentavos)
            }
            hint={
              summary.totalCurrentValueCentavos === null
                ? 'no valuations yet'
                : undefined
            }
          />
          <Tile
            label="Gain"
            value={
              summary.totalGainCentavos === null
                ? '—'
                : formatPeso(summary.totalGainCentavos)
            }
            good={
              summary.totalGainCentavos !== null &&
              summary.totalGainCentavos > 0
            }
            danger={
              summary.totalGainCentavos !== null &&
              summary.totalGainCentavos < 0
            }
          />
        </dl>
      ) : null}

      {isError ? (
        <ErrorState title="Could not load funds" retry={() => void refetch()} />
      ) : isPending && funds.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : funds.length === 0 ? (
        <EmptyState
          title={status === 'active' ? 'No funds yet' : 'Nothing here'}
          description="Track money you set aside — a mutual fund, an emergency fund, a time deposit. A goal and a valuation are both optional."
          icon={<PiggyBank className="size-5" />}
          action={{ label: 'New fund', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {funds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              onEdit={() => setEditing(fund)}
              onAdd={() => setAdding(fund)}
              onTake={() => setTaking(fund)}
              onHistory={() => setViewing(fund)}
            />
          ))}
        </ul>
      )}

      <FlowHistoryPanel fund={viewing} onClose={() => setViewing(null)} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New investment or fund</DialogTitle>
          </DialogHeader>
          <FundForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {editing ? (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit fund</DialogTitle>
            </DialogHeader>
            <FundForm existing={editing} onDone={() => setEditing(null)} />
          </DialogContent>
        </Dialog>
      ) : null}

      {adding ? (
        <Dialog open onOpenChange={(next) => !next && setAdding(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add to {adding.name}</DialogTitle>
            </DialogHeader>
            <ContributeForm fund={adding} onDone={() => setAdding(null)} />
          </DialogContent>
        </Dialog>
      ) : null}

      {taking ? (
        <Dialog open onOpenChange={(next) => !next && setTaking(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Withdraw from {taking.name}</DialogTitle>
            </DialogHeader>
            <WithdrawForm fund={taking} onDone={() => setTaking(null)} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  good,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3.5 shadow-sm">
      <dt className="text-2xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'tnum mt-1 text-xl font-bold',
          good && 'text-ink-income',
          danger && 'text-ink-expense',
        )}
      >
        {value}
      </dd>
      {hint ? (
        <p className="text-2xs mt-0.5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function FundCard({
  fund,
  onEdit,
  onAdd,
  onTake,
  onHistory,
}: {
  fund: TInvestment;
  onEdit: () => void;
  onAdd: () => void;
  onTake: () => void;
  onHistory: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteInvestment(fund.id);

  async function handleDelete() {
    const res = await del.mutateAsync();
    toast.success(
      res.keptTransactionCount > 0
        ? `Fund deleted. ${res.keptTransactionCount} entr${res.keptTransactionCount === 1 ? 'y' : 'ies'} kept in your ledger.`
        : 'Fund deleted.',
    );
    setConfirming(false);
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{fund.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {fund.provider ? `${fund.provider} · ` : ''}
            {KIND_LABELS[fund.kind]}
          </p>
        </div>
        <StatusBadge fund={fund} />
      </div>

      {/* A goal shows progress. No goal shows the running total instead — an
          empty progress bar against an invented target would be a lie. */}
      {fund.targetCentavos !== null ? (
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="tnum">
              {formatPeso(fund.netContributedCentavos)} of{' '}
              {formatPeso(fund.targetCentavos)}
            </span>
            <span className="text-muted-foreground">
              {fund.percentToTarget}%
            </span>
          </div>
          <Meter
            percent={fund.percentToTarget}
            tone={fund.status === 'funded' ? 'income' : 'neutral'}
            label={`${fund.name} progress`}
          />
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Put in</span>
          <AmountText centavos={fund.netContributedCentavos} size="sm" />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2.5 text-xs">
        <dt className="text-muted-foreground">Value</dt>
        <dd className="tnum text-right font-semibold">
          {fund.currentValueCentavos === null
            ? '—'
            : formatPeso(fund.currentValueCentavos)}
        </dd>

        {fund.gainCentavos !== null ? (
          <>
            <dt className="text-muted-foreground">Gain</dt>
            <dd
              className={cn(
                'tnum text-right font-semibold',
                fund.gainCentavos > 0 && 'text-ink-income',
                fund.gainCentavos < 0 && 'text-ink-expense',
              )}
            >
              {/* Sign prefix, never colour alone — the CVD fallback. */}
              {fund.gainCentavos > 0 ? '+' : ''}
              {formatPeso(fund.gainCentavos)}
              {fund.gainPercent === null ? '' : ` (${fund.gainPercent}%)`}
            </dd>
          </>
        ) : null}

        {fund.valueAsOf ? (
          <>
            <dt className="text-muted-foreground">As of</dt>
            <dd className="text-right">{formatDisplayDate(fund.valueAsOf)}</dd>
          </>
        ) : null}

        {fund.targetDate ? (
          <>
            <dt className="text-muted-foreground">Goal date</dt>
            <dd className="text-right">{formatDisplayDate(fund.targetDate)}</dd>
          </>
        ) : null}
      </dl>

      <div className="flex flex-wrap items-center justify-end gap-1 border-t pt-2">
        <Button size="sm" onClick={onAdd}>
          <ArrowUpRight className="size-3.5" />
          Add money
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTake}
          disabled={fund.netContributedCentavos <= 0}
        >
          <ArrowDownLeft className="size-3.5" />
          Withdraw
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onHistory}
          aria-label="Entry history"
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
        title="Delete this fund?"
        description="Contributions and withdrawals you already recorded stay in your ledger — that money really did move."
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

function StatusBadge({ fund }: { fund: TInvestment }) {
  if (fund.status === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  if (fund.status === 'funded') {
    return (
      <Badge
        variant="outline"
        className="border-good/30 bg-good-tint text-good"
      >
        <CircleCheck />
        Goal reached
      </Badge>
    );
  }
  if (fund.targetCentavos === null) {
    return <Badge variant="secondary">Open-ended</Badge>;
  }
  return (
    <Badge variant="outline">
      <Target />
      Saving
    </Badge>
  );
}

function FundForm({
  existing,
  onDone,
}: {
  existing?: TInvestment;
  onDone: () => void;
}) {
  const create = useCreateInvestment();
  const update = useUpdateInvestment(existing?.id ?? '');
  const { data: categoryData } = useCategories({ kind: 'expense' });
  const { data: accountData } = useAccounts();

  const form = useForm<TInvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          provider: existing.provider ?? '',
          kind: existing.kind,
          target:
            existing.targetCentavos === null
              ? ''
              : centavosToInputString(existing.targetCentavos),
          targetDate: existing.targetDate ?? '',
          currentValue:
            existing.currentValueCentavos === null
              ? ''
              : centavosToInputString(existing.currentValueCentavos),
          valueAsOf: existing.valueAsOf ?? '',
          categoryId: existing.categoryId,
          accountId: existing.accountId,
          note: existing.note ?? '',
        }
      : {
          name: '',
          provider: '',
          kind: 'fund',
          target: '',
          targetDate: '',
          currentValue: '',
          valueAsOf: '',
          categoryId: '',
          accountId: '',
          note: '',
        },
  });

  async function handleSubmit(values: TInvestmentFormValues) {
    // Blank means "not set" — send null, never a zero or today's date.
    const payload = {
      name: values.name,
      provider: values.provider?.trim() ? values.provider.trim() : null,
      kind: values.kind,
      targetCentavos: values.target ? parsePesoInput(values.target) : null,
      targetDate: values.targetDate ? values.targetDate : null,
      currentValueCentavos: values.currentValue
        ? parsePesoInput(values.currentValue)
        : null,
      valueAsOf: values.valueAsOf ? values.valueAsOf : null,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    if (existing) {
      await update.mutateAsync(payload);
      toast.success('Fund updated');
    } else {
      await create.mutateAsync(payload);
      toast.success('Fund added');
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
                <Input placeholder="Emergency Fund" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Where is it held?</FormLabel>
              <FormControl>
                <Input placeholder="Optional — COL, BPI, SeaBank" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) => KIND_LABELS[v as keyof typeof KIND_LABELS]}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INVESTMENT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
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
          name="target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal amount</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormDescription>
                Optional. Leave blank to just accumulate with no target.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                Optional. Shows on the calendar — a goal, so it never marks the
                day overdue.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value today</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormDescription>
                Optional, and entered by hand — the app never fetches prices.
                Leave blank and it just tracks what you put in.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valueAsOf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value as of</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                So you can see when a figure went stale.
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
              <FormLabel>Category for contributions</FormLabel>
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
              <FormLabel>Fund from</FormLabel>
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
            {existing ? 'Save changes' : 'Add fund'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ContributeForm({
  fund,
  onDone,
}: {
  fund: TInvestment;
  onDone: () => void;
}) {
  const contribute = useContribute(fund.id);

  const form = useForm<TContributeFormValues>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: '', paidDate: todayPlainDate(), note: '' },
  });

  async function handleSubmit(values: TContributeFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;

    await contribute.mutateAsync({
      amountCentavos,
      paidDate: values.paidDate,
      note: values.note?.trim() ? values.note.trim() : null,
    });
    toast.success(`Added · ${formatPeso(amountCentavos)} expense recorded`);
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          In so far{' '}
          <span className="tnum font-bold">
            {formatPeso(fund.netContributedCentavos)}
          </span>
        </p>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                Recorded as a real expense on the fund's account.
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
          <Button type="submit" disabled={contribute.isPending}>
            Add money
          </Button>
        </div>
      </form>
    </Form>
  );
}

function WithdrawForm({
  fund,
  onDone,
}: {
  fund: TInvestment;
  onDone: () => void;
}) {
  const withdraw = useWithdraw(fund.id);
  // Income categories only: money leaving a fund arrives somewhere, and an
  // income transaction must reference an income category.
  const { data: categoryData } = useCategories({ kind: 'income' });

  const form = useForm<TWithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: '',
      paidDate: todayPlainDate(),
      categoryId: '',
      note: '',
    },
  });

  async function handleSubmit(values: TWithdrawFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;

    await withdraw.mutateAsync({
      amountCentavos,
      categoryId: values.categoryId,
      paidDate: values.paidDate,
      note: values.note?.trim() ? values.note.trim() : null,
    });
    toast.success(`Withdrawn · ${formatPeso(amountCentavos)} income recorded`);
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          In so far{' '}
          <span className="tnum font-bold">
            {formatPeso(fund.netContributedCentavos)}
          </span>
        </p>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                A fund that grew can pay out more than you put in, so this is
                not capped.
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
              <FormLabel>Where does it land?</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an income category">
                      {(v) =>
                        (categoryData?.result ?? []).find((c) => c.id === v)
                          ?.name ?? 'Select an income category'
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
          <Button type="submit" disabled={withdraw.isPending}>
            Withdraw
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Every contribution and withdrawal for one fund, and the only place one can be
 * removed. The transactions module shows the same rows read-only — one record,
 * one owner.
 */
function FlowHistoryPanel({
  fund,
  onClose,
}: {
  fund: TInvestment | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const { data, isPending, isError, refetch } = useInvestment(fund?.id ?? '');
  const flows = data?.result?.flows ?? [];

  return (
    <Sheet open={fund !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md'
        }
      >
        <SheetHeader>
          <SheetTitle>{fund?.name ?? 'Entries'}</SheetTitle>
          <SheetDescription>
            {fund
              ? `${formatPeso(fund.netContributedCentavos)} in · ${formatPeso(
                  fund.contributedCentavos,
                )} added, ${formatPeso(fund.withdrawnCentavos)} taken out`
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {isError ? (
            <ErrorState
              title="Could not load entries"
              retry={() => void refetch()}
            />
          ) : isPending && flows.length === 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : flows.length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Use Add money to put something in."
              icon={<History className="size-5" />}
            />
          ) : (
            <ul className="flex flex-col">
              {flows.map((flow) => (
                <FlowRow key={flow.id} fundId={fund?.id ?? ''} flow={flow} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FlowRow({
  fundId,
  flow,
}: {
  fundId: string;
  flow: {
    id: string;
    type: 'income' | 'expense';
    amountCentavos: number;
    txnDate: string;
    note: string | null;
  };
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteFlow(fundId);
  // An expense put money IN; an income took it back out.
  const isContribution = flow.type === 'expense';

  async function handleDelete() {
    await del.mutateAsync({ transactionId: flow.id });
    toast.success(
      isContribution
        ? 'Contribution removed — the fund balance went down'
        : 'Withdrawal removed — the fund balance went back up',
    );
    setConfirming(false);
  }

  return (
    <li className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {formatDisplayDate(flow.txnDate)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {isContribution ? 'Added' : 'Withdrawn'}
          {flow.note ? ` · ${flow.note}` : ''}
        </span>
      </span>

      <AmountText
        centavos={flow.amountCentavos}
        kind={isContribution ? 'expense' : 'income'}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label="Remove entry"
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title="Remove this entry?"
        description="It is deleted from your ledger and the fund's balance moves to match."
        confirmLabel="Remove"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

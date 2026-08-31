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
  fundSignedCentavos,
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
  const [showingUntracked, setShowingUntracked] = useState(false);

  const { data, isPending, isError, refetch } = useInvestments(status);
  const { data: summaryData } = useInvestmentSummary();
  const { data: activeData } = useInvestments('active');

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
          {/* HELD, not just the valued funds: a fund with no valuation still
              holds what was put into it, and counting only valued ones made
              this tile smaller than the cards directly beneath it added up to. */}
          <Tile
            label="Current value"
            value={formatPeso(summary.totalHeldCentavos)}
            hint={
              summary.totalCurrentValueCentavos === null
                ? 'from what you put in — no valuations yet'
                : undefined
            }
          />
          {/* Only when there IS untracked money. A ₱0.00 tile here would be
              noise on a portfolio where every peso was logged through the app. */}
          {summary.untrackedCentavos > 0 ? (
            <Tile
              label="Already there"
              value={formatPeso(summary.untrackedCentavos)}
              hint="not put in here · tap to see which"
              onClick={() => setShowingUntracked(true)}
            />
          ) : null}
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

      <UntrackedDialog
        open={showingUntracked}
        onClose={() => setShowingUntracked(false)}
        funds={activeData?.result ?? []}
      />

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
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean;
  danger?: boolean;
  /** Makes the tile a button. Only pass one when there is something to open. */
  onClick?: () => void;
}) {
  const body = (
    <>
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
    </>
  );

  // A real button when clickable, so keyboard and screen readers get it for
  // free rather than a div with a click handler bolted on.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border bg-card p-3.5 text-left shadow-sm transition-colors hover:bg-muted"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3.5 shadow-sm">{body}</div>
  );
}

/**
 * One labelled line on a fund card. Its own row so the divider spans the full
 * width, and so the rows stay aligned however many of them are shown.
 */
function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tnum text-right', strong && 'font-semibold')}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Where the "already there" money is. Broken down per fund and computed the
 * same way the API does — value minus this fund's own contributions, floored
 * at zero — so the rows always add up to the tile that opened them.
 */
function UntrackedDialog({
  open,
  onClose,
  funds,
}: {
  open: boolean;
  onClose: () => void;
  funds: TInvestment[];
}) {
  // Server-derived, not recomputed here: one definition of "already there",
  // shared by the card, this dialog and the summary tile.
  const rows = funds
    .filter((f) => f.untrackedCentavos > 0)
    .sort((a, b) => b.untrackedCentavos - a.untrackedCentavos);

  const total = rows.reduce((sum, f) => sum + f.untrackedCentavos, 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Money already in your funds</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          These pots were already holding money before you started tracking
          here, so this app never saw it arrive. It is your money — not a gain,
          and not counted in Total put in.
        </p>

        <ul className="flex flex-col divide-y rounded-lg border">
          {rows.map((fund) => (
            <li key={fund.id} className="flex flex-col gap-0.5 p-3">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">
                  {fund.name}
                </span>
                <span className="tnum shrink-0 text-sm font-semibold">
                  {formatPeso(fund.untrackedCentavos)}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                worth {formatPeso(fund.currentValueCentavos ?? 0)} · you put in{' '}
                {formatPeso(fund.netContributedCentavos)} here
              </span>
            </li>
          ))}
        </ul>

        <p className="flex items-baseline justify-between gap-3 border-t pt-3 text-sm font-semibold">
          <span>Total</span>
          <span className="tnum">{formatPeso(total)}</span>
        </p>
      </DialogContent>
    </Dialog>
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
  // Defaults to KEEPING the entries: deleting real ledger rows by accident is
  // the worse of the two mistakes, so the destructive option is opted into.
  // The dialog spells out both, because keeping them is what makes money look
  // like it vanished from an account.
  const [refund, setRefund] = useState(false);
  const hasEntries = fund.contributedCentavos > 0 || fund.withdrawnCentavos > 0;
  const del = useDeleteInvestment(fund.id);

  async function handleDelete() {
    const res = await del.mutateAsync({ removeTransactions: refund });
    toast.success(
      res.removedTransactionCount > 0
        ? `Fund deleted. ${res.removedTransactionCount} entr${res.removedTransactionCount === 1 ? 'y' : 'ies'} removed — the money is back in your accounts.`
        : res.keptTransactionCount > 0
          ? `Fund deleted. ${res.keptTransactionCount} entr${res.keptTransactionCount === 1 ? 'y' : 'ies'} kept in your ledger.`
          : 'Fund deleted.',
    );
    setConfirming(false);
    setRefund(false);
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
            {/* Reads what the pot HOLDS, not only what was logged here, so
                the figure and the bar agree with each other. */}
            <span className="tnum">
              {formatPeso(fund.heldCentavos)} of{' '}
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

      {/* A flex column of bordered rows rather than a 2-column grid: a grid
          cannot draw a line across a dt/dd pair without bordering each cell
          separately, which leaves a seam down the middle. */}
      <dl className="flex flex-col border-t text-xs">
        <DetailRow
          label="Value"
          value={
            fund.currentValueCentavos === null
              ? '—'
              : formatPeso(fund.currentValueCentavos)
          }
          strong
        />

        {/* Splits the value into where it came from. Without this the card
            shows ₱17,000 held against ₱0 contributed with no explanation of
            how both can be true. */}
        {fund.untrackedCentavos > 0 ? (
          <>
            <DetailRow
              label="Put in here"
              value={formatPeso(fund.netContributedCentavos)}
            />
            <DetailRow
              label="Already there"
              value={formatPeso(fund.untrackedCentavos)}
            />
          </>
        ) : null}

        {fund.valueAsOf ? (
          <DetailRow label="As of" value={formatDisplayDate(fund.valueAsOf)} />
        ) : null}

        {fund.targetDate ? (
          <DetailRow
            label="Goal date"
            value={formatDisplayDate(fund.targetDate)}
          />
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
        description={
          hasEntries
            ? `This fund has ${fund.contributedCentavos > 0 ? formatPeso(fund.netContributedCentavos) : 'entries'} recorded against it. Choose what happens to that money.`
            : 'Nothing has been recorded against this fund, so no money is affected.'
        }
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      >
        {hasEntries ? (
          <fieldset className="mt-1 flex flex-col gap-2">
            <legend className="sr-only">What happens to the money</legend>
            {[
              {
                value: false,
                label: 'Keep the entries',
                hint: 'The money really left your accounts, so the balances stay as they are. The entries just stop belonging to a fund.',
              },
              {
                value: true,
                label: 'Put the money back',
                hint: 'Deletes those entries, so your balances rise back by exactly what went in. Use this if the money never actually moved.',
              },
            ].map((opt) => (
              <label
                key={String(opt.value)}
                className={cn(
                  'flex cursor-pointer gap-2.5 rounded-md border p-2.5 text-left',
                  refund === opt.value && 'border-primary bg-accent',
                )}
              >
                <input
                  type="radio"
                  name="refund"
                  className="mt-0.5"
                  checked={refund === opt.value}
                  onChange={() => setRefund(opt.value)}
                />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
      </ConfirmDialog>
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
  const { data: categoryData } = useCategories({
    kind: 'expense',
    scope: 'personal',
  });
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
              <FormLabel>Held at</FormLabel>
              <FormControl>
                <Input
                  placeholder="Pag-IBIG, COL Financial, MariBank"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional. The institution holding the money — not one of your
                accounts below.
              </FormDescription>
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
              <FormLabel>Money comes from</FormLabel>
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
              <FormDescription>
                The account each contribution is taken out of.
              </FormDescription>
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
  const { data: accountData } = useAccounts();
  const accounts = accountData?.result ?? [];

  const form = useForm<TContributeFormValues>({
    resolver: zodResolver(contributeSchema),
    defaultValues: {
      amount: '',
      paidDate: todayPlainDate(),
      // The fund's own account is the usual answer, but not the only one — the
      // money can come from wherever you actually paid it from.
      accountId: fund.accountId,
      note: '',
    },
  });

  async function handleSubmit(values: TContributeFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;

    await contribute.mutateAsync({
      amountCentavos,
      paidDate: values.paidDate,
      accountId: values.accountId,
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
                Recorded as a real expense, so the account below drops by this
                much.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From account</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick an account">
                      {(v) =>
                        accounts.find((a) => a.id === v)?.name ??
                        'Pick an account'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Which account the money leaves. Defaults to the fund's own.
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
  const { data: categoryData } = useCategories({
    kind: 'income',
    scope: 'personal',
  });
  const { data: accountData } = useAccounts();
  const accounts = accountData?.result ?? [];

  const form = useForm<TWithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: '',
      paidDate: todayPlainDate(),
      categoryId: '',
      accountId: fund.accountId,
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
      accountId: values.accountId,
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
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Into account</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick an account">
                      {(v) =>
                        accounts.find((a) => a.id === v)?.name ??
                        'Pick an account'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Which account the money lands in. Defaults to the fund's own.
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
        // The sheet's own data-[side=right]:w-3/4 is more specific than a bare
        // sm:w-1/2, so the width has to be set on the same variant to win.
        className={
          isMobile
            ? 'max-h-[88dvh] rounded-t-2xl'
            : 'w-full data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none'
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
    accountName: string;
    categoryName: string | null;
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
        {/* The account is the part that was missing: with contributions now
            able to come from any account, "Added ₱5,000" alone does not say
            where the money left from. */}
        <span className="truncate text-xs text-muted-foreground">
          {isContribution ? 'Added from' : 'Withdrawn to'} {flow.accountName}
          {flow.categoryName ? ` · ${flow.categoryName}` : ''}
        </span>
        {flow.note ? (
          <span className="truncate text-xs text-muted-foreground">
            {flow.note}
          </span>
        ) : null}
      </span>

      {/* Signed by the FUND, not the ledger: every row here is a fund movement,
          and a red minus beside "Added from Gotyme" reads as money spent. */}
      <AmountText centavos={fundSignedCentavos(flow)} kind="saved" />

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

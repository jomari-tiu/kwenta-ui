import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  History,
  Pencil,
  Plus,
  Store,
  Trash2,
  TriangleAlert,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/useMobile';
import {
  AmountText,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  MoneyInput,
} from '@/components/finance';
import { formatDisplayDate, todayPlainDate } from '@/lib/date';
import { formatPeso, parsePesoInput } from '@/lib/money';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { useCategories } from '@/pages/categories/_hooks/api';
import {
  useAddCapital,
  useAddDrawing,
  useAddEntry,
  useBusinesses,
  useBusinessEntries,
  useCreateBusiness,
  useDeleteBusiness,
  useDeleteEntry,
  useUpdateBusiness,
} from './_hooks/api';
import {
  businessSchema,
  entrySchema,
  movementSchema,
  NO_ACCOUNT,
  type TBusiness,
  type TBusinessEntry,
  type TBusinessEntryKind,
  type TBusinessFormValues,
  type TEntryFormValues,
  type TMovementFormValues,
} from './_types';

const ENTRY_LABEL: Record<TBusinessEntryKind, string> = {
  revenue: 'Revenue',
  cost: 'Cost',
  capital: 'Capital in',
  drawing: 'Drawing',
};

type TStatus = 'active' | 'closed' | 'all';

export default function BusinessesPage() {
  const [status, setStatus] = useState<TStatus>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TBusiness | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useBusinesses(status);
  const businesses = data?.result ?? [];
  const open = businesses.find((b) => b.id === openId) ?? null;

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(business: TBusiness) {
    setEditing(business);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as TStatus)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={handleAdd}>
          <Plus className="size-4" />
          Add business
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load businesses"
          retry={() => void refetch()}
        />
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={<Store className="size-8" />}
          title="No businesses yet"
          description="Add a business to keep its takings and costs in their own books, without changing what your personal dashboard says."
          action={{ label: 'Add business', onClick: handleAdd }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onOpen={() => setOpenId(b.id)}
              onEdit={() => handleEdit(b)}
            />
          ))}
        </div>
      )}

      <BusinessFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <BusinessPanel
        business={open}
        onClose={() => setOpenId(null)}
        onEdit={() => open && handleEdit(open)}
      />
    </div>
  );
}

function BusinessCard({
  business,
  onOpen,
  onEdit,
}: {
  business: TBusiness;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteBusiness(business.id);
  const isProfitable = business.netCashCentavos >= 0;

  function handleDelete() {
    void del
      .mutateAsync()
      .then((r) => {
        toast.success(
          r.keptTransactionCount > 0
            ? `Business deleted. ${r.keptTransactionCount} entries kept in the ledger.`
            : 'Business deleted',
        );
        setConfirming(false);
      })
      .catch(() => undefined);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left hover:underline"
        >
          <p className="truncate font-semibold">{business.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {business.accountName ?? 'Shares your personal accounts'}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {business.isClosed ? <Badge variant="outline">Closed</Badge> : null}
          <Button size="icon" variant="ghost" onClick={onOpen}>
            <Eye className="size-4" />
            <span className="sr-only">View {business.name}</span>
          </Button>
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Pencil className="size-4" />
            <span className="sr-only">Edit {business.name}</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-4 text-destructive" />
            <span className="sr-only">Delete {business.name}</span>
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {business.hasOwnAccount ? 'Cash on hand' : 'Net cash'}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatPeso(
            business.actualBalanceCentavos ?? business.netCashCentavos,
          )}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Row label="Revenue">
          <AmountText centavos={business.revenueCentavos} kind="income" />
        </Row>
        <Row label="Costs">
          <AmountText centavos={business.costCentavos} kind="expense" />
        </Row>
        <Row label="Capital in">
          <span className="tabular-nums">
            {formatPeso(business.capitalCentavos)}
          </span>
        </Row>
        <Row label="Drawings">
          <span className="tabular-nums">
            {formatPeso(business.drawingCentavos)}
          </span>
        </Row>
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-2 border-t pt-3">
        <span className="text-xs font-medium">Net cash</span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            isProfitable ? 'text-ink-income' : 'text-ink-expense',
          )}
        >
          {formatPeso(business.netCashCentavos)}
        </span>
      </div>

      <ReconciliationNote business={business} />

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        title={`Delete ${business.name}?`}
        description="Its entries stay in your ledger — that money really moved — but they stop counting towards any business, and the account keeps its balance."
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The whole reason the business owns a real account: the books and the balance
 * must agree. Silence when they do; a plain explanation when they do not.
 */
function ReconciliationNote({ business }: { business: TBusiness }) {
  const diff = business.reconciliationDiffCentavos;
  // Null means the business has no account of its own, so there is no balance
  // to check the books against and no discrepancy to claim.
  if (diff === null || diff === 0) return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-warn-tint p-2 text-xs text-ink-warn">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      {/* The two directions have opposite causes, and saying the wrong one
          sends you looking in the wrong place. MORE in the account than the
          books explain means something sitting there is untagged; LESS means
          the business's money ended up somewhere else entirely. */}
      <span>
        {diff > 0
          ? `${formatPeso(diff)} more in ${business.accountName} than these entries explain — something in that account is not tagged to this business.`
          : `${formatPeso(Math.abs(diff))} of this business's money is not in ${business.accountName} — an entry was probably paid into or out of a personal account instead.`}
      </span>
    </p>
  );
}

function BusinessFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TBusiness | null;
}) {
  const { data: accountData } = useAccounts();
  const accounts = (accountData?.result ?? []).filter(
    (a) => a.kind !== 'credit_card',
  );
  // The DTO already carries the name, so an archived account — or a list that
  // has not loaded yet — still shows a name rather than a bare uuid.
  const editingAccountName = editing?.accountName;

  const create = useCreateBusiness();
  const update = useUpdateBusiness(editing?.id ?? '');
  const isPending = create.isPending || update.isPending;

  const form = useForm<TBusinessFormValues>({
    resolver: zodResolver(businessSchema),
    values: {
      name: editing?.name ?? '',
      accountId: editing?.accountId ?? NO_ACCOUNT,
      startedOn: editing?.startedOn ?? todayPlainDate(),
      note: editing?.note ?? '',
    },
  });

  function handleSubmit(values: TBusinessFormValues) {
    const payload = {
      name: values.name,
      accountId: values.accountId === NO_ACCOUNT ? null : values.accountId,
      startedOn: values.startedOn || null,
      note: values.note || null,
    };
    const run = editing
      ? update.mutateAsync(payload)
      : create.mutateAsync(payload);
    void run
      .then(() => {
        toast.success(editing ? 'Business updated' : 'Business added');
        onOpenChange(false);
      })
      .catch(() => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit business' : 'Add business'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sari-sari store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {(v) =>
                            v === NO_ACCOUNT || !v
                              ? 'Shares my personal accounts'
                              : (accounts.find((a) => a.id === v)?.name ??
                                editingAccountName ??
                                'Shares my personal accounts')
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_ACCOUNT}>
                        Shares my personal accounts
                      </SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Give it its own account only if the money really is kept
                    separate — that unlocks capital and drawings, and lets the
                    books be checked against a real balance. Otherwise leave it
                    sharing your accounts and just record revenue and costs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startedOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Started</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {editing ? 'Save' : 'Add business'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BusinessPanel({
  business,
  onClose,
  onEdit,
}: {
  business: TBusiness | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isMobile = useIsMobile();
  const [entryOpen, setEntryOpen] = useState(false);
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = business?.id ?? '';
  const { data: entryData, isPending } = useBusinessEntries(id);
  const entries: TBusinessEntry[] = entryData?.result ?? [];
  const remove = useDeleteBusiness(id);

  function handleDelete() {
    void remove
      .mutateAsync()
      .then((r) => {
        toast.success(
          `Business deleted. ${r.keptTransactionCount} entries kept in the ledger.`,
        );
        setConfirmDelete(false);
        onClose();
      })
      .catch(() => undefined);
  }

  return (
    <Sheet open={business !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none"
      >
        {business === null ? null : (
          <>
            <SheetHeader>
              <SheetTitle>{business.name}</SheetTitle>
              <SheetDescription>
                {business.hasOwnAccount
                  ? `${formatPeso(business.actualBalanceCentavos ?? 0)} in ${business.accountName}`
                  : `${formatPeso(business.netCashCentavos)} net cash · shares your personal accounts`}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setEntryOpen(true)}>
                  <Plus className="size-4" />
                  Add entry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCapitalOpen(true)}
                >
                  <ArrowDownLeft className="size-4" />
                  Capital in
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDrawingOpen(true)}
                >
                  <ArrowUpRight className="size-4" />
                  Drawing
                </Button>
              </div>

              <ReconciliationNote business={business} />

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <History className="size-4" />
                  Entries
                </h3>
                {isPending ? (
                  <Skeleton className="h-24" />
                ) : entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing recorded yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {entries.map((e) => (
                      <EntryRow key={e.id} businessId={business.id} entry={e} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ink-expense"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>

            <EntryDialog
              business={business}
              open={entryOpen}
              onOpenChange={setEntryOpen}
            />
            <MovementDialog
              business={business}
              direction="capital"
              open={capitalOpen}
              onOpenChange={setCapitalOpen}
            />
            <MovementDialog
              business={business}
              direction="drawing"
              open={drawingOpen}
              onOpenChange={setDrawingOpen}
            />
            <ConfirmDialog
              open={confirmDelete}
              onClose={() => setConfirmDelete(false)}
              tone="danger"
              title={`Delete ${business.name}?`}
              description="Its entries stay in the ledger — the money really moved — but they stop counting towards any business."
              confirmLabel="Delete"
              onConfirm={handleDelete}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EntryRow({
  businessId,
  entry,
}: {
  businessId: string;
  entry: TBusinessEntry;
}) {
  const [confirm, setConfirm] = useState(false);
  const remove = useDeleteEntry(businessId);

  // Signed from the BUSINESS's point of view, which is whose books these are:
  // revenue and capital are money arriving, costs and drawings money leaving.
  // Signing a capital injection as negative made funding the business look
  // like a loss to it.
  const kind: 'income' | 'expense' =
    entry.kind === 'revenue' || entry.kind === 'capital' ? 'income' : 'expense';

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm">
          {entry.categoryName ?? ENTRY_LABEL[entry.kind]}
        </p>
        <p className="text-xs text-muted-foreground">
          {ENTRY_LABEL[entry.kind]}
          {entry.isEarmark ? ' · recorded only' : ''} ·{' '}
          {formatDisplayDate(entry.txnDate)}
          {entry.note ? ` · ${entry.note}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <AmountText centavos={entry.amountCentavos} kind={kind} />
        <Button size="icon" variant="ghost" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" />
          <span className="sr-only">Delete entry</span>
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="danger"
        title="Remove this entry?"
        description="It is deleted from the ledger, so the account balance moves back."
        confirmLabel="Remove"
        onConfirm={() => {
          void remove
            .mutateAsync({ transactionId: entry.id })
            .then(() => {
              toast.success('Entry removed');
              setConfirm(false);
            })
            .catch(() => undefined);
        }}
      />
    </li>
  );
}

function EntryDialog({
  business,
  open,
  onOpenChange,
}: {
  business: TBusiness;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useAddEntry(business.id);
  const { data: accountData } = useAccounts();
  const accounts = accountData?.result ?? [];
  const form = useForm<TEntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      kind: 'revenue',
      amount: '',
      categoryId: '',
      accountId: '',
      txnDate: todayPlainDate(),
      note: '',
    },
  });

  // useWatch, not form.watch(): the compiler cannot memoize the function
  // watch() returns, and this component owns its useForm().
  const kind = useWatch({ control: form.control, name: 'kind' });
  // Business categories only — the whole point of the scope split.
  const { data: categoryData } = useCategories({
    kind: kind === 'revenue' ? 'income' : 'expense',
    scope: 'business',
  });
  const categories = categoryData?.result ?? [];

  function handleSubmit(values: TEntryFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;
    // The account only travels when the business has none of its own; with a
    // dedicated account the server files every entry against it.
    if (!business.hasOwnAccount && !values.accountId) {
      form.setError('accountId', {
        message: 'Pick the account this was paid from',
      });
      return;
    }
    void add
      .mutateAsync({
        kind: values.kind,
        amountCentavos,
        categoryId: values.categoryId,
        txnDate: values.txnDate,
        note: values.note || null,
        ...(business.hasOwnAccount ? {} : { accountId: values.accountId }),
      })
      .then(() => {
        toast.success(
          values.kind === 'revenue' ? 'Revenue added' : 'Cost added',
        );
        form.reset({
          kind: values.kind,
          amount: '',
          categoryId: '',
          // Kept: logging several entries in a row is almost always the same
          // account, and retyping it each time is pure friction.
          accountId: values.accountId,
          txnDate: values.txnDate,
          note: '',
        });
        onOpenChange(false);
      })
      .catch(() => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('categoryId', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {(v) => (v === 'cost' ? 'Cost' : 'Revenue')}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="cost">Cost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a category">
                          {(v) =>
                            categories.find((c) => c.id === v)?.name ??
                            'Pick a category'
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
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
              name="txnDate"
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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {business.hasOwnAccount ? (
              <FormDescription>
                Recorded against {business.accountName}, the business account.
              </FormDescription>
            ) : (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid from</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
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
                      Which of your accounts the money actually moved through.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={add.isPending}>
                Add
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({
  business,
  direction,
  open,
  onOpenChange,
}: {
  business: TBusiness;
  direction: 'capital' | 'drawing';
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const capital = useAddCapital(business.id);
  const drawing = useAddDrawing(business.id);
  const isCapital = direction === 'capital';
  const isPending = isCapital ? capital.isPending : drawing.isPending;

  const { data: accountData } = useAccounts();
  // EVERY account is offered, the business's own included. Picking that one
  // means no money actually moves — it only records how much of what is
  // already there belongs to the business — and the server stores it as an
  // earmark rather than a transfer.
  const accounts = accountData?.result ?? [];

  const form = useForm<TMovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      amount: '',
      accountId: '',
      txnDate: todayPlainDate(),
      note: '',
    },
  });

  // Picking the business's own account means nothing actually moves.
  const chosenAccountId = useWatch({
    control: form.control,
    name: 'accountId',
  });
  // MUST mirror the server's rule exactly: no money moves when the business
  // has no pot of its own, OR when the chosen account IS that pot. Checking
  // only the second half told the user "Moves into null" while the server
  // quietly recorded an earmark — the UI promising something it did not do.
  const isEarmark =
    business.accountId === null || chosenAccountId === business.accountId;

  function handleSubmit(values: TMovementFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;
    const run = isCapital
      ? capital.mutateAsync({
          amountCentavos,
          fromAccountId: values.accountId,
          txnDate: values.txnDate,
          note: values.note || null,
        })
      : drawing.mutateAsync({
          amountCentavos,
          toAccountId: values.accountId,
          txnDate: values.txnDate,
          note: values.note || null,
        });
    void run
      .then(() => {
        toast.success(isCapital ? 'Capital added' : 'Drawing recorded');
        form.reset({
          amount: '',
          accountId: values.accountId,
          txnDate: values.txnDate,
          note: '',
        });
        onOpenChange(false);
      })
      .catch(() => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCapital ? 'Capital in' : 'Drawing out'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
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
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isCapital ? 'From' : 'To'}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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
                    {isEarmark
                      ? isCapital
                        ? `No money moves and no balance changes — this only records that some of what is already there is the business's. Give ${business.name} its own account if you want the money actually moved.`
                        : `No money moves and no balance changes — this only records what you have taken for yourself. Give ${business.name} its own account if you want the money actually moved.`
                      : isCapital
                        ? `Moves into ${business.accountName}, so that account drops by this much. Neither income nor spending — your total does not change.`
                        : `Moves out of ${business.accountName} and becomes yours to spend.`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="txnDate"
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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isCapital ? 'Add capital' : 'Record drawing'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

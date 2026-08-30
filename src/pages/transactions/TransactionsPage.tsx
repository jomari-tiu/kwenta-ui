import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Download,
  ExternalLink,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { AmountText, ConfirmDialog, ErrorState } from '@/components/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import { TransactionDialog } from '@/components/TransactionDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useMobile';
import { formatDisplayDate } from '@/lib/date';
import { formatPeso, parsePesoInput } from '@/lib/money';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { useCategories } from '@/pages/categories/_hooks/api';
import {
  PAGE_SIZE,
  downloadTransactionsCsv,
  useDeleteTransaction,
  useTransactions,
} from './_hooks/api';
import type {
  TLedgerType,
  TTransaction,
  TTransactionBucket,
  TTransactionFilters,
  TTransactionSummary,
} from './_types';

/** SelectItem cannot take an empty value, so "All" needs a sentinel. */
const ALL_VALUE = '__all__';

export default function TransactionsPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<TTransaction | null>(null);
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [type, setType] = useState<TLedgerType | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const filters: TTransactionFilters = useMemo(
    () => ({
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(type ? { type } : {}),
      ...(categoryId ? { categoryId: [categoryId] } : {}),
      ...(accountId ? { accountId: [accountId] } : {}),
      ...(parsePesoInput(amountMin) !== null
        ? { amountMinCentavos: parsePesoInput(amountMin)! }
        : {}),
      ...(parsePesoInput(amountMax) !== null
        ? { amountMaxCentavos: parsePesoInput(amountMax)! }
        : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      sortBy: 'date',
      sortDir: 'desc',
    }),
    [
      dateFrom,
      dateTo,
      type,
      categoryId,
      accountId,
      amountMin,
      amountMax,
      debouncedSearch,
    ],
  );

  // Only the summary tiles and the error state come from here now — each
  // section fetches its own rows. pageSize 1 because the `summary` block spans
  // every matching row, not the page.
  const { data, isError, refetch } = useTransactions(filters, 1, 1);
  const { data: categoryData } = useCategories({ includeArchived: true });
  const { data: accountData } = useAccounts({ includeArchived: true });

  const summary = (
    data?.payload as { summary?: TTransactionSummary } | undefined
  )?.summary;

  const activeFilterCount = [
    dateFrom,
    dateTo,
    type,
    categoryId,
    accountId,
    amountMin,
    amountMax,
  ].filter(Boolean).length;

  function resetFilters() {
    setDateFrom('');
    setDateTo('');
    setType('');
    setCategoryId('');
    setAccountId('');
    setAmountMin('');
    setAmountMax('');
  }

  async function handleExport() {
    setExporting(true);
    try {
      // Server-side, so the file contains EVERY matching row rather than the 20
      // on screen.
      await downloadTransactionsCsv(filters);
      toast.success('Export downloaded');
    } finally {
      setExporting(false);
    }
  }

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Type</Label>
        <Select
          value={type || ALL_VALUE}
          onValueChange={(v) => {
            setType(v === ALL_VALUE || v === null ? '' : (v as TLedgerType));
            setCategoryId('');
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : v === 'income'
                    ? 'Income'
                    : 'Expense'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Category</Label>
        <Select
          value={categoryId || ALL_VALUE}
          onValueChange={(v) => {
            setCategoryId(v === ALL_VALUE || v === null ? '' : v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : ((categoryData?.result ?? []).find((c) => c.id === v)
                      ?.name ?? 'All')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {(categoryData?.result ?? [])
              .filter((c) => !type || c.kind === type)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Account</Label>
        <Select
          value={accountId || ALL_VALUE}
          onValueChange={(v) => {
            setAccountId(v === ALL_VALUE || v === null ? '' : v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : ((accountData?.result ?? []).find((a) => a.id === v)
                      ?.name ?? 'All')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {(accountData?.result ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        <div className="grid gap-2">
          <Label htmlFor="min">Min ₱</Label>
          <Input
            id="min"
            inputMode="decimal"
            value={amountMin}
            onChange={(e) => {
              setAmountMin(e.target.value);
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="max">Max ₱</Label>
          <Input
            id="max"
            inputMode="decimal"
            value={amountMax}
            onChange={(e) => {
              setAmountMax(e.target.value);
            }}
            placeholder="Any"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search notes…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />

        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Filters
          {/* Without this count, a filter set in the drawer and forgotten looks
              like missing data. */}
          {activeFilterCount > 0 ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-accent text-accent-foreground"
            >
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>

        {activeFilterCount > 0 ? (
          <Button variant="ghost" onClick={resetFilters}>
            <X className="size-4" />
            Clear
          </Button>
        ) : null}

        <Button
          variant="outline"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="ml-auto"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      {summary ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile label="Matching" value={String(summary.count)} />
          <SummaryTile
            label="Income"
            value={formatPeso(summary.incomeCentavos)}
            tone="income"
          />
          <SummaryTile
            label="Expense"
            value={formatPeso(summary.expenseCentavos)}
            tone="expense"
          />
          <SummaryTile
            label="Net"
            value={formatPeso(summary.netCentavos)}
            tone={summary.netCentavos < 0 ? 'expense' : 'income'}
          />
        </dl>
      ) : null}

      {isError ? (
        <ErrorState
          title="Could not load transactions"
          retry={() => void refetch()}
        />
      ) : (
        /*
         * One table per bucket rather than a single mixed list. The five
         * buckets partition the ledger — every row appears in exactly one — so
         * the section totals add up to the tiles above with nothing
         * double-counted. Spending leads because it is what gets reviewed.
         */
        <div className="flex flex-col gap-6">
          {BUCKET_SECTIONS.map((section) => (
            <BucketSection
              key={section.bucket}
              section={section}
              filters={filters}
              isMobile={isMobile}
              onEdit={setEditing}
              hasFilters={activeFilterCount > 0 || debouncedSearch.length > 0}
            />
          ))}
        </div>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={
            isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md'
          }
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4">
            {filterFields}
          </div>

          <SheetFooter className="flex-row justify-between">
            <Button variant="ghost" onClick={resetFilters}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {editing ? (
        <TransactionDialog
          open
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

type TBucketSection = {
  bucket: TTransactionBucket;
  title: string;
  /** Says what the bucket EXCLUDES, which is the part that surprises people. */
  hint: string;
  /** Spending is the main table: everything else starts collapsed. */
  isMain?: boolean;
};

const BUCKET_SECTIONS: TBucketSection[] = [
  {
    bucket: 'spending',
    title: 'Expenses',
    hint: 'total spent — excludes fund contributions and business costs',
    isMain: true,
  },
  {
    bucket: 'income',
    title: 'Income',
    hint: 'total earned — excludes fund withdrawals and business revenue',
  },
  {
    bucket: 'invested',
    title: 'Saved & invested',
    hint: 'net put into funds — still your money',
  },
  {
    bucket: 'business',
    title: 'Business',
    hint: 'net cash made — capital and drawings are listed inside',
  },
  {
    bucket: 'transfer',
    title: 'Transfers',
    hint: 'total moved between your own accounts — changes no total',
  },
];

function BucketSection({
  section,
  filters,
  isMobile,
  onEdit,
  hasFilters,
}: {
  section: TBucketSection;
  filters: TTransactionFilters;
  isMobile: boolean;
  onEdit: (txn: TTransaction) => void;
  hasFilters: boolean;
}) {
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(section.isMain ?? false);

  // Adjusting state during render, the documented alternative to an effect:
  // without it a section left on page 3 shows an empty table once a filter
  // narrows the result to a single page.
  const [seenFilters, setSeenFilters] = useState(filters);
  if (seenFilters !== filters) {
    setSeenFilters(filters);
    setPage(1);
  }

  const bucketFilters = useMemo(
    () => ({ ...filters, bucket: section.bucket }),
    [filters, section.bucket],
  );

  const { data, isPending, isFetching } = useTransactions(bucketFilters, page);
  const rows = data?.result ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;

  const summary = (
    data?.payload as { summary?: TTransactionSummary } | undefined
  )?.summary;
  // What each bucket's one headline number actually means differs, so pick it
  // deliberately rather than summing everything. A bucket made only of
  // transfers has no income or expense at all, and showing ₱0.00 beside a row
  // count reads as a bug.
  const headlineCentavos = !summary
    ? 0
    : section.bucket === 'income'
      ? summary.incomeCentavos
      : section.bucket === 'spending'
        ? summary.expenseCentavos
        : section.bucket === 'invested'
          ? // Net INTO funds: contributions are expenses, withdrawals income.
            summary.expenseCentavos - summary.incomeCentavos
          : section.bucket === 'business'
            ? // Net cash the business made. Capital and drawings are transfers
              // and belong to neither side of this.
              summary.incomeCentavos - summary.expenseCentavos
            : summary.transferCentavos;

  // An empty bucket the user did not filter into is noise, not information —
  // but while filtering, "0 matches here" is the answer to their question.
  if (!isPending && total === 0 && !hasFilters && !section.isMain) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b pb-2 text-left"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-semibold">{section.title}</span>
          <span className="truncate text-2xs text-text-muted">
            {section.hint}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-text-muted">
            {total} · {formatPeso(headlineCentavos)}
          </span>
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              isOpen ? 'rotate-180' : '',
            )}
            aria-hidden
          />
        </span>
      </button>

      {!isOpen ? null : isPending && rows.length === 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          {hasFilters ? 'Nothing matches here.' : 'Nothing recorded yet.'}
        </p>
      ) : (
        <div
          className={cn('mt-3', isFetching && 'opacity-60 transition-opacity')}
        >
          {/* A 6-column table on a 390px screen is unusable, and a horizontally
              scrolling table is worse. Same data, different presentation. */}
          {isMobile ? (
            <ul className="flex flex-col gap-2">
              {rows.map((t) => (
                <TransactionCard key={t.id} txn={t} onEdit={() => onEdit(t)} />
              ))}
            </ul>
          ) : (
            <TransactionTable rows={rows} onEdit={onEdit} />
          )}

          {meta && total > PAGE_SIZE ? (
            <nav className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} · {total} total
              </p>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrevious}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </span>
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-2xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={
          tone === 'income'
            ? 'tnum mt-1 font-bold text-ink-income'
            : tone === 'expense'
              ? 'tnum mt-1 font-bold text-ink-expense'
              : 'tnum mt-1 font-bold'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function TransactionTable({
  rows,
  onEdit,
}: {
  rows: TTransaction[];
  onEdit: (t: TTransaction) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left">
          <tr className="text-2xs font-bold tracking-wide text-muted-foreground uppercase">
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Category</th>
            <th className="px-3 py-2.5">Account</th>
            <th className="px-3 py-2.5">Note</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="w-24 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t hover:bg-muted/50">
              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                {formatDisplayDate(t.txnDate)}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <CategoryIcon
                    name={t.category.icon}
                    color={t.category.color}
                    size="sm"
                  />
                  {t.category.name}
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {t.account.name}
              </td>
              <td className="max-w-48 px-3 py-2.5 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {/* A transfer names its destination, so the row explains
                      itself without opening it. */}
                  <span className="truncate">
                    {t.transferAccount
                      ? `→ ${t.transferAccount.name}`
                      : (t.note ?? '—')}
                    {t.transferAccount && t.note ? ` · ${t.note}` : ''}
                  </span>
                  {t.creditLoanId !== null ? (
                    <Badge variant="secondary" className="shrink-0">
                      Loan
                    </Badge>
                  ) : null}
                  {t.investmentId !== null ? (
                    <Badge variant="secondary" className="shrink-0">
                      Fund
                    </Badge>
                  ) : null}
                  {t.businessId !== null ? (
                    <Badge variant="secondary" className="shrink-0">
                      {t.businessName ?? 'Business'}
                    </Badge>
                  ) : null}
                  {/* Recurring rows stay EDITABLE, unlike loan and fund rows —
                      a rule derives nothing from them, so changing one is just
                      correcting that month. The badge says where it came from
                      so the row is not mistaken for something typed by hand. */}
                  {t.recurringRuleId !== null ? (
                    <Badge variant="secondary" className="shrink-0">
                      {t.isEdited ? 'Recurring · edited' : 'Recurring'}
                    </Badge>
                  ) : null}
                  {t.type === 'transfer' ? (
                    <Badge variant="secondary" className="shrink-0">
                      Transfer
                    </Badge>
                  ) : null}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <AmountText
                  centavos={t.amountCentavos}
                  kind={t.type === 'transfer' ? 'plain' : t.type}
                />
              </td>
              <td className="px-1 py-2.5 text-right">
                <RowActions txn={t} onEdit={() => onEdit(t)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionCard({
  txn,
  onEdit,
}: {
  txn: TTransaction;
  onEdit: () => void;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border bg-card p-3">
      <CategoryIcon name={txn.category.icon} color={txn.category.color} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {txn.category.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {formatDisplayDate(txn.txnDate)} · {txn.account.name}
        </span>
        {txn.note ? (
          <span className="truncate text-xs text-muted-foreground/70">
            {txn.note}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <AmountText
          centavos={txn.amountCentavos}
          kind={txn.type === 'transfer' ? 'plain' : txn.type}
        />
        <RowActions txn={txn} onEdit={onEdit} />
      </span>
    </li>
  );
}

function RowActions({
  txn,
  onEdit,
}: {
  txn: TTransaction;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteTransaction(txn.id);
  const navigate = useNavigate();

  async function handleDelete() {
    await del.mutateAsync();
    toast.success('Transaction deleted');
    setConfirming(false);
  }

  // A row owned by another module is display-only here. Editing a loan
  // repayment or a fund contribution from this screen would move a balance the
  // screen does not show, so both actions collapse into "go where it lives".
  const owner =
    txn.creditLoanId !== null
      ? { to: '/credit-loans', label: 'Credit Loans' }
      : txn.investmentId !== null
        ? { to: '/investments', label: 'Investments' }
        : txn.businessId !== null
          ? { to: '/businesses', label: 'Businesses' }
          : null;

  if (owner) {
    return (
      <span className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate(owner.to)}
          aria-label={`Open in ${owner.label}`}
          title={`Managed in ${owner.label}`}
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end">
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
    </span>
  );
}

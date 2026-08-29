import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Archive,
  ArchiveRestore,
  History,
  Pencil,
  Plus,
  Star,
  TriangleAlert,
} from 'lucide-react';
import {
  AmountText,
  ConfirmDialog,
  EmptyState,
  ErrorState,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDisplayDate } from '@/lib/date';
import { useIsMobile } from '@/hooks/useMobile';
import { MoneyInput } from '@/components/finance';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { centavosToInputString, formatPeso, parsePesoInput } from '@/lib/money';
import { ACCOUNT_ICONS, INIT_ACCOUNT } from './_constant';
import {
  useAccountHistory,
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useRestoreAccount,
  useUpdateAccount,
} from './_hooks/api';
import {
  ACCOUNT_KINDS,
  ACCOUNT_KIND_LABELS,
  accountSchema,
  type TAccount,
  type TAccountFormValues,
} from './_types';

export default function AccountsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TAccount | null>(null);
  const [viewing, setViewing] = useState<TAccount | null>(null);

  const { data, isPending, isError, refetch } = useAccounts({
    includeArchived: showArchived,
  });
  const accounts = data?.result ?? [];

  const overdrawn = (data?.result ?? []).filter(
    (a) => a.kind !== 'credit_card' && a.currentBalanceCentavos < 0,
  );

  return (
    <div className="flex flex-col gap-4">
      {overdrawn.length > 0 ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>
            {overdrawn.length === 1
              ? `${overdrawn[0].name} is negative`
              : `${overdrawn.length} accounts are negative`}
          </AlertTitle>
          <AlertDescription>
            {overdrawn
              .map((a) => `${a.name} ${formatPeso(a.currentBalanceCentavos)}`)
              .join(' · ')}
            {' — '}usually the wrong account on some transactions rather than a
            real shortfall. Open an account's history to find them.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="flex items-center gap-2 font-normal text-muted-foreground">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
        </Label>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New account
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load accounts"
          retry={() => void refetch()}
        />
      ) : isPending && accounts.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts"
          action={{ label: 'Add one', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border bg-card">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              onEdit={() => setEditing(a)}
              onHistory={() => setViewing(a)}
            />
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
          </DialogHeader>
          <AccountFormBody onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <AccountHistoryPanel account={viewing} onClose={() => setViewing(null)} />

      {editing ? (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
            </DialogHeader>
            <AccountFormBody
              existing={editing}
              onDone={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function AccountRow({
  account,
  onEdit,
  onHistory,
}: {
  account: TAccount;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteAccount(account.id);
  const restore = useRestoreAccount(account.id);

  async function handleDelete() {
    const res = await del.mutateAsync();
    toast.success(
      'archived' in res
        ? `Archived — used by ${res.referenceCount} record(s)`
        : 'Account deleted',
    );
    setConfirming(false);
  }

  return (
    <li
      className={cn(
        'flex items-center gap-3 border-b px-3 py-3 last:border-b-0',
        account.isArchived && 'opacity-60',
      )}
    >
      <CategoryIcon name={account.icon} color={account.color} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
          {account.name}
          {account.isDefault ? (
            <Star className="size-3 fill-warn text-warn" aria-label="Default" />
          ) : null}
          {account.isArchived ? (
            <span className="text-xs text-muted-foreground/70">archived</span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {ACCOUNT_KIND_LABELS[account.kind]}
          {account.creditLimitCentavos !== null
            ? ` · limit ${formatPeso(account.creditLimitCentavos)}`
            : ''}
        </span>
      </span>

      <span className="flex flex-col items-end">
        <AmountText centavos={account.currentBalanceCentavos} kind="net" />
        {account.openingBalanceCentavos !== 0 ? (
          <span className="text-2xs text-muted-foreground/70">
            opened {formatPeso(account.openingBalanceCentavos)}
          </span>
        ) : null}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onHistory}
        aria-label={`History for ${account.name}`}
      >
        <History className="size-3.5" />
      </Button>

      {account.isArchived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void restore.mutateAsync()}
          disabled={restore.isPending}
        >
          <ArchiveRestore className="size-3.5" />
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label="Delete"
          >
            <Archive className="size-3.5 text-warn" />
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title="Remove this account?"
        description="If it has any transactions it will be archived rather than deleted, so old entries keep showing its name."
        confirmLabel="Remove"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

function AccountFormBody({
  existing,
  onDone,
}: {
  existing?: TAccount;
  onDone: () => void;
}) {
  const create = useCreateAccount();
  const update = useUpdateAccount(existing?.id ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? INIT_ACCOUNT.icon);

  const defaultValues: TAccountFormValues = existing
    ? {
        name: existing.name,
        kind: existing.kind,
        icon: existing.icon ?? INIT_ACCOUNT.icon,
        color: existing.color ?? INIT_ACCOUNT.color,
        openingBalance: centavosToInputString(existing.openingBalanceCentavos),
        creditLimit:
          existing.creditLimitCentavos !== null
            ? centavosToInputString(existing.creditLimitCentavos)
            : '',
        isDefault: existing.isDefault,
      }
    : { ...INIT_ACCOUNT };

  const form = useForm<TAccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues,
  });

  async function handleSubmit(values: TAccountFormValues) {
    const payload = {
      name: values.name,
      kind: values.kind,
      icon,
      color: values.color,
      openingBalanceCentavos: parsePesoInput(values.openingBalance) ?? 0,
      creditLimitCentavos: values.creditLimit
        ? parsePesoInput(values.creditLimit)
        : null,
      isDefault: values.isDefault,
    };

    if (existing) {
      await update.mutateAsync(payload);
      toast.success('Account updated');
    } else {
      await create.mutateAsync(payload);
      toast.success('Account created');
    }
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit((v) => void handleSubmit(v))(e)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoFocus {...field} />
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
                    <SelectValue placeholder="Select a type">
                      {(v) =>
                        ACCOUNT_KIND_LABELS[v as TAccount['kind']] ??
                        'Select a type'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACCOUNT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ACCOUNT_KIND_LABELS[k]}
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
          name="openingBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening balance</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormDescription>
                What was in it before you started tracking.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit limit</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormDescription>
                Credit cards only. Leave blank otherwise.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {ACCOUNT_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={name}
                aria-pressed={icon === name}
                className={cn(
                  'rounded-md p-1',
                  icon === name ? 'bg-accent' : 'hover:bg-muted',
                )}
              >
                <CategoryIcon name={name} size="sm" />
              </button>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2.5">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">
                Default account for new entries
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {existing ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * One account's ledger, newest first, with the balance as of each row.
 *
 * The running balance is computed server-side with a window function. Summing
 * the page here would restart from zero on page 2 and print wrong balances,
 * which is worse than showing none at all.
 */
function AccountHistoryPanel({
  account,
  onClose,
}: {
  account: TAccount | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

  // A fresh account starts at page 1 rather than inheriting the last one's.
  const id = account?.id ?? null;
  const [lastId, setLastId] = useState<string | null>(id);
  if (id !== lastId) {
    setLastId(id);
    setPage(1);
  }

  const { data, isPending, isError, refetch } = useAccountHistory(id, page);
  const rows = data?.result ?? [];
  const meta = data?.meta;

  return (
    <Sheet open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-lg'
        }
      >
        <SheetHeader>
          <SheetTitle>{account?.name ?? 'History'}</SheetTitle>
          <SheetDescription>
            {account
              ? `Balance ${formatPeso(account.currentBalanceCentavos)}${
                  account.openingBalanceCentavos !== 0
                    ? ` · opened at ${formatPeso(account.openingBalanceCentavos)}`
                    : ''
                }`
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {isError ? (
            <ErrorState
              title="Could not load history"
              retry={() => void refetch()}
            />
          ) : isPending && rows.length === 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="No income or expenses have been recorded on this account."
              icon={<History className="size-5" />}
            />
          ) : (
            <ul className="flex flex-col">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                >
                  <CategoryIcon name={r.categoryIcon} color={r.categoryColor} />

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {r.categoryName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatDisplayDate(r.txnDate)}
                      {r.note ? ` · ${r.note}` : ''}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end">
                    {/* A transfer in is money arriving, a transfer out is
                        money leaving — sign it by direction, not by type. */}
                    <AmountText
                      centavos={r.amountCentavos}
                      kind={
                        r.type === 'transfer'
                          ? r.isIncoming
                            ? 'income'
                            : 'expense'
                          : r.type
                      }
                    />
                    {/* The point of the panel: what the account held at
                        this moment, not just what moved. */}
                    <span className="tnum text-2xs text-muted-foreground/70">
                      {formatPeso(r.runningBalanceCentavos)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {meta && (meta.hasPrevious || meta.hasNext) ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPrevious}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Newer
              </Button>
              <span className="text-xs text-muted-foreground">
                {meta.total} entr{meta.total === 1 ? 'y' : 'ies'}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Older
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

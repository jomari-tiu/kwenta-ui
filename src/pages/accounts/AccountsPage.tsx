import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, Pencil, Plus, Star } from 'lucide-react';
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
import { MoneyInput } from '@/components/finance';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { centavosToInputString, formatPeso, parsePesoInput } from '@/lib/money';
import { ACCOUNT_ICONS, INIT_ACCOUNT } from './_constant';
import {
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

  const { data, isPending, isError, refetch } = useAccounts({
    includeArchived: showArchived,
  });
  const accounts = data?.result ?? [];

  return (
    <div className="flex flex-col gap-4">
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
            <AccountRow key={a.id} account={a} onEdit={() => setEditing(a)} />
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
}: {
  account: TAccount;
  onEdit: () => void;
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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { MoneyInput } from '@/components/finance';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { centavosToInputString, formatPeso, parsePesoInput } from '@/lib/money';
import {
  CATEGORY_COLORS,
  CATEGORY_ICON_NAMES,
  INIT_CATEGORY,
} from './_constant';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRestoreCategory,
  useUpdateCategory,
} from './_hooks/api';
import {
  categorySchema,
  type TCategory,
  type TCategoryFormValues,
  type TCategoryKind,
} from './_types';

export default function CategoriesPage() {
  // Tabs make the kind constraint VISIBLE, so nobody creates "Salary" under
  // expenses. `kind` is immutable server-side for the same reason.
  const [kind, setKind] = useState<TCategoryKind>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<TCategory | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isPending, isError, refetch } = useCategories({
    kind,
    includeArchived: showArchived,
  });

  const categories = data?.result ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as TCategoryKind)}>
          <TabsList aria-label="Category kind">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <Label className="flex items-center gap-2 font-normal text-muted-foreground">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            Show archived
          </Label>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load categories"
          retry={() => void refetch()}
        />
      ) : isPending && categories.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title={`No ${kind} categories`}
          action={{ label: 'Add one', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border bg-card">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} onEdit={() => setEditing(c)} />
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New {kind} category</DialogTitle>
          </DialogHeader>
          <CategoryFormBody kind={kind} onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {editing ? (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <CategoryFormBody
              kind={editing.kind}
              existing={editing}
              onDone={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function CategoryRow({
  category,
  onEdit,
}: {
  category: TCategory;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteCategory(category.id);
  const restore = useRestoreCategory(category.id);

  async function handleDelete() {
    const res = await del.mutateAsync();
    if ('archived' in res) {
      toast.success(`Archived — used by ${res.referenceCount} record(s)`);
    } else {
      toast.success('Category deleted');
    }
    setConfirming(false);
  }

  return (
    <li
      className={cn(
        'flex items-center gap-3 border-b px-3 py-3 last:border-b-0',
        category.isArchived && 'opacity-60',
      )}
    >
      <CategoryIcon name={category.icon} color={category.color} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {category.name}
          {category.isArchived ? (
            <span className="ml-2 text-xs text-muted-foreground/70">
              archived
            </span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {category.transactionCount} transaction
          {category.transactionCount === 1 ? '' : 's'}
          {category.monthlyBudgetCentavos !== null
            ? ` · cap ${formatPeso(category.monthlyBudgetCentavos)}`
            : ''}
        </span>
      </span>

      {category.isArchived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void restore.mutateAsync()}
          disabled={restore.isPending}
        >
          <ArchiveRestore className="size-3.5" />
          Restore
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
            {category.transactionCount > 0 ? (
              <Archive className="size-3.5 text-warn" />
            ) : (
              <Trash2 className="size-3.5 text-destructive" />
            )}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleDelete()}
        title={
          category.transactionCount > 0
            ? 'Archive this category?'
            : 'Delete this category?'
        }
        description={
          category.transactionCount > 0
            ? `It's used by ${category.transactionCount} record(s), so it will be archived rather than deleted — old entries keep showing its name.`
            : 'It has never been used, so it will be removed completely.'
        }
        confirmLabel={category.transactionCount > 0 ? 'Archive' : 'Delete'}
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

function CategoryFormBody({
  kind,
  existing,
  onDone,
}: {
  kind: TCategoryKind;
  existing?: TCategory;
  onDone: () => void;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory(existing?.id ?? '');

  const [icon, setIcon] = useState(existing?.icon ?? INIT_CATEGORY.icon);
  const [color, setColor] = useState(existing?.color ?? INIT_CATEGORY.color);

  const defaultValues: TCategoryFormValues = existing
    ? {
        name: existing.name,
        icon: existing.icon ?? INIT_CATEGORY.icon,
        color: existing.color ?? INIT_CATEGORY.color,
        monthlyBudget:
          existing.monthlyBudgetCentavos !== null
            ? centavosToInputString(existing.monthlyBudgetCentavos)
            : '',
      }
    : { ...INIT_CATEGORY };

  const form = useForm<TCategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  async function handleSubmit(values: TCategoryFormValues) {
    const cap = values.monthlyBudget
      ? parsePesoInput(values.monthlyBudget)
      : null;

    const payload = {
      name: values.name,
      icon,
      color,
      // Income categories cannot carry a budget — the API enforces it too.
      monthlyBudgetCentavos: kind === 'expense' ? cap : null,
    };

    if (existing) {
      await update.mutateAsync(payload);
      toast.success('Category updated');
    } else {
      await create.mutateAsync({ ...payload, kind });
      toast.success('Category created');
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

        {kind === 'expense' ? (
          <FormField
            control={form.control}
            name="monthlyBudget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly cap</FormLabel>
                <FormControl>
                  <MoneyInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormDescription>Leave blank for no budget.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Colour</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                className={cn(
                  'size-8 rounded-full border-2 transition-transform',
                  color === c
                    ? 'scale-110 border-foreground'
                    : 'border-transparent',
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Icon</span>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
            {CATEGORY_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={name}
                aria-pressed={icon === name}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  icon === name ? 'bg-accent' : 'hover:bg-muted',
                )}
              >
                <CategoryIcon name={name} color={color} size="sm" />
              </button>
            ))}
          </div>
        </div>

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

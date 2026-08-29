import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { MoneyInput } from '@/components/finance';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useCategories } from '@/pages/categories/_hooks/api';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { formatPeso } from '@/lib/money';
import { transactionSchema, type TTransactionFormValues } from '../_types';

export type TransactionFormProps = {
  mode: 'create' | 'edit';
  defaultValues: TTransactionFormValues;
  onSubmit: (values: TTransactionFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
  /** Compact layout for the inline form inside the day panel. */
  compact?: boolean;
};

/**
 * Presentation + validation only — the PAGE owns the mutation and passes
 * `onSubmit` and `loading`.
 */
export function TransactionForm({
  mode,
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  compact,
}: TransactionFormProps) {
  const form = useForm<TTransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <Fields form={form} compact={compact} />

        <div
          className={cn(
            'flex justify-end gap-2',
            compact ? 'pt-2' : 'border-t pt-4',
          )}
        >
          {onCancel ? (
            <Button
              variant="outline"
              type="button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={loading}>
            {mode === 'create' ? 'Add' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Fields({
  form,
  compact,
}: {
  form: UseFormReturn<TTransactionFormValues>;
  compact?: boolean;
}) {
  const type = form.watch('type');

  const isTransfer = type === 'transfer';
  // A transfer has no category, so do not fetch one — 'transfer' is not a
  // category kind and the request would 400.
  const { data: categoryData } = useCategories({
    kind: isTransfer ? 'expense' : type,
  });
  const { data: accountData } = useAccounts();

  const categories = categoryData?.result ?? [];
  const accounts = accountData?.result ?? [];

  return (
    <>
      {/* Switching type clears the category — an expense category is invalid on
          an income row, and the API rejects it. */}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              form.setValue('type', t);
              // Clear the fields the other shapes do not own, so a leftover
              // value cannot be submitted invisibly.
              form.setValue('categoryId', '');
              form.setValue('transferAccountId', '');
            }}
            aria-pressed={type === t}
            className={cn(
              'min-h-9 rounded-md text-sm font-semibold capitalize transition-colors',
              type === t
                ? t === 'income'
                  ? 'bg-background text-ink-income shadow-sm'
                  : t === 'transfer'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'bg-background text-ink-expense shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

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
            <FormMessage />
          </FormItem>
        )}
      />

      {/* A chip grid, not a select. On mobile the native picker is a modal
          wheel that covers the form; this is one tap. Hidden for transfers —
          moving your own money between pockets has no category. */}
      {isTransfer ? null : (
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => field.onChange(c.id)}
                    aria-pressed={field.value === c.id}
                    className={cn(
                      'flex min-h-10 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-colors',
                      field.value === c.id
                        ? 'border-primary bg-accent font-semibold text-accent-foreground'
                        : 'hover:bg-muted',
                    )}
                  >
                    <CategoryIcon name={c.icon} color={c.color} size="sm" />
                    <span className="max-w-32 truncate">{c.name}</span>
                  </button>
                ))}
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories yet — add one under Categories.
                  </p>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isTransfer ? 'From' : 'Account'}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an account">
                    {(v) =>
                      accounts.find((a) => a.id === v)?.name ??
                      'Select an account'
                    }
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {/* The balance sits in the picker because most wrong-account
                        entries are a mis-tap, not a decision — seeing the
                        number is what catches it before saving. */}
                    <span className="flex w-full items-center justify-between gap-4">
                      <span>{a.name}</span>
                      <span
                        className={cn(
                          'tnum text-xs',
                          a.currentBalanceCentavos < 0
                            ? 'text-ink-expense'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatPeso(a.currentBalanceCentavos)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {isTransfer ? (
        <FormField
          control={form.control}
          name="transferAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an account">
                      {(v) =>
                        accounts.find((a) => a.id === v)?.name ??
                        'Select an account'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* The source is filtered out: a transfer to the same account
                      is a no-op the database rejects anyway. */}
                  {accounts
                    .filter((a) => a.id !== form.watch('accountId'))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex w-full items-center justify-between gap-4">
                          <span>{a.name}</span>
                          <span className="tnum text-xs text-muted-foreground">
                            {formatPeso(a.currentBalanceCentavos)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Moving your own money. This is neither income nor spending, so
                your totals will not change — only the two balances.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

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

      {!compact ? (
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}

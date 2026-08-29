import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
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

  const { data: categoryData } = useCategories({ kind: type });
  const { data: accountData } = useAccounts();

  const categories = categoryData?.result ?? [];
  const accounts = accountData?.result ?? [];

  return (
    <>
      {/* Switching type clears the category — an expense category is invalid on
          an income row, and the API rejects it. */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              form.setValue('type', t);
              form.setValue('categoryId', '');
            }}
            aria-pressed={type === t}
            className={cn(
              'min-h-9 rounded-md text-sm font-semibold capitalize transition-colors',
              type === t
                ? t === 'income'
                  ? 'bg-background text-ink-income shadow-sm'
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
          wheel that covers the form; this is one tap. */}
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

      <FormField
        control={form.control}
        name="accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account</FormLabel>
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
                    {a.name}
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

import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { todayPlainDate, partsOf } from '@/lib/date';
import { parsePesoInput } from '@/lib/money';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { useCategories } from '@/pages/categories/_hooks/api';
import { SchedulePreview } from '../_components/SchedulePreview';
import { planSchema, type TPlanFormValues } from '../_types';

export type InstallmentFormProps = {
  mode: 'create' | 'edit';
  defaultValues?: TPlanFormValues;
  onSubmit: (values: TPlanFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
  /** Schedule fields lock once any payment is marked paid. */
  scheduleLocked?: boolean;
};

function initialValues(): TPlanFormValues {
  const today = todayPlainDate();
  return {
    name: '',
    merchant: '',
    total: '',
    termMonths: '12',
    startDate: today,
    dayOfMonth: String(partsOf(today).day),
    categoryId: '',
    accountId: '',
    note: '',
  };
}

export function InstallmentForm({
  mode,
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  scheduleLocked,
}: InstallmentFormProps) {
  const form = useForm<TPlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultValues ?? initialValues(),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
      >
        <Fields form={form} scheduleLocked={scheduleLocked} />

        <div className="flex justify-end gap-2 border-t pt-4">
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
            {mode === 'create' ? 'Create plan' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Fields({
  form,
  scheduleLocked,
}: {
  form: UseFormReturn<TPlanFormValues>;
  scheduleLocked?: boolean;
}) {
  const { data: categoryData } = useCategories({ kind: 'expense' });
  const { data: accountData } = useAccounts();

  const total = parsePesoInput(form.watch('total') ?? '');
  const termMonths = Number(form.watch('termMonths'));
  const dayOfMonth = Number(form.watch('dayOfMonth'));
  const startDate = form.watch('startDate');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is it?</FormLabel>
              <FormControl>
                <Input placeholder="Lenovo laptop" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="total"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total to pay</FormLabel>
              <FormControl>
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={scheduleLocked}
                />
              </FormControl>
              <FormDescription>
                The full amount including interest.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="termMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Months</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    disabled={scheduleLocked}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due day</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    disabled={scheduleLocked}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First payment</FormLabel>
              <FormControl>
                <Input type="date" disabled={scheduleLocked} {...field} />
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

        {scheduleLocked ? (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-xs text-warn">
            Some payments are already marked paid, so the schedule is locked.
            Unmark them first, or create a new plan.
          </p>
        ) : null}
      </div>

      {/* Live, local preview. A server round trip per keystroke would kill the
          feature — see docs/conventions.md for how drift is caught instead. */}
      <SchedulePreview
        totalCentavos={total}
        termMonths={termMonths}
        startDate={startDate}
        dayOfMonth={dayOfMonth}
      />
    </div>
  );
}

import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AmountText,
  ConfirmDialog,
  EmptyState,
  ErrorState,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { useGet, useMutate } from '@/lib/api';
import { LEDGER_KEYS, RECURRING_KEY } from '@/lib/queryKeys';
import { formatDisplayDate, partsOf, todayPlainDate } from '@/lib/date';
import { centavosToInputString, parsePesoInput } from '@/lib/money';
import { useAccounts } from '@/pages/accounts/_hooks/api';
import { useCategories } from '@/pages/categories/_hooks/api';
import { describeRule } from './_recurrence';
import {
  FREQUENCIES,
  ruleSchema,
  type TRecurringRule,
  type TRuleFormValues,
} from './_types';

export default function RecurringRulesPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TRecurringRule | null>(null);

  const { data, isPending, isError, refetch } = useGet<TRecurringRule[]>({
    isList: true,
    url: '/api/v1/recurring-rules',
    key: [RECURRING_KEY, 'list'],
    params: { pageNumber: 1, pageSize: 100 },
    staleTime: 5 * 60_000,
  });

  const rules = data?.result ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Salary, rent, subscriptions — anything that repeats.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New rule
        </Button>
      </div>

      {isError ? (
        <ErrorState title="Could not load rules" retry={() => void refetch()} />
      ) : isPending && rules.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No recurring rules"
          description="Set up your salary once instead of retyping it every month. Paid on the 15th and the last day? That's two monthly rules — day 15 and day 31."
          action={{ label: 'New rule', onClick: () => setCreating(true) }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => setEditing(rule)}
            />
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New recurring rule</DialogTitle>
          </DialogHeader>
          <RuleFormBody onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {editing ? (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit rule</DialogTitle>
            </DialogHeader>
            <RuleFormBody existing={editing} onDone={() => setEditing(null)} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function RuleCard({
  rule,
  onEdit,
}: {
  rule: TRecurringRule;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const pause = useMutate<void, unknown>({
    url: `/api/v1/recurring-rules/${rule.id}/pause`,
    method: 'post',
    invalidateKeys: LEDGER_KEYS.concat([[RECURRING_KEY]]),
  });
  const resume = useMutate<void, unknown>({
    url: `/api/v1/recurring-rules/${rule.id}/resume`,
    method: 'post',
    invalidateKeys: LEDGER_KEYS.concat([[RECURRING_KEY]]),
  });
  const del = useMutate<void, { deletedTransactionCount: number }>({
    url: `/api/v1/recurring-rules/${rule.id}`,
    method: 'delete',
    invalidateKeys: LEDGER_KEYS.concat([[RECURRING_KEY]]),
  });

  async function handleDelete() {
    await del.mutateAsync();
    // deleteGenerated defaults to `none`, so history survives.
    toast.success('Rule deleted. Entries it already created were kept.');
    setConfirming(false);
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3.5',
        !rule.isActive && 'opacity-60',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium">{rule.name}</span>
          <Badge
            variant={rule.type === 'income' ? 'outline' : 'secondary'}
            className={
              rule.type === 'income'
                ? 'border-good/30 bg-good-tint text-good'
                : undefined
            }
          >
            {rule.type}
          </Badge>
          {!rule.isActive ? (
            <Badge
              variant="outline"
              className="border-warn/30 bg-warn-tint text-warn"
            >
              Paused
            </Badge>
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {describeRule(rule)}
        </span>
        {rule.isActive && rule.nextOccurrence ? (
          <span className="text-xs text-muted-foreground/70">
            Next {formatDisplayDate(rule.nextOccurrence)}
          </span>
        ) : null}
      </span>

      <AmountText centavos={rule.amountCentavos} kind={rule.type} />

      <Switch
        checked={rule.isActive}
        onCheckedChange={(next) => {
          if (next) void resume.mutateAsync();
          else void pause.mutateAsync();
        }}
        aria-label={rule.isActive ? 'Pause rule' : 'Resume rule'}
      />

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
        title="Delete this rule?"
        description="Entries it has already created are KEPT — deleting a rule should not rewrite your history."
        confirmLabel="Delete"
        tone="danger"
        loading={del.isPending}
      />
    </li>
  );
}

function RuleFormBody({
  existing,
  onDone,
}: {
  existing?: TRecurringRule;
  onDone: () => void;
}) {
  const create = useMutate<Record<string, unknown>, TRecurringRule>({
    url: '/api/v1/recurring-rules',
    method: 'post',
    // Saving a rule can materialize back-dated transactions, so this IS a
    // ledger event.
    invalidateKeys: LEDGER_KEYS.concat([[RECURRING_KEY]]),
  });
  const update = useMutate<Record<string, unknown>, unknown>({
    url: `/api/v1/recurring-rules/${existing?.id ?? ''}`,
    method: 'patch',
    invalidateKeys: LEDGER_KEYS.concat([[RECURRING_KEY]]),
  });

  const today = todayPlainDate();
  const defaultValues: TRuleFormValues = existing
    ? {
        name: existing.name,
        type: existing.type,
        amount: centavosToInputString(existing.amountCentavos),
        frequency: existing.frequency,
        dayOfWeek: String(existing.dayOfWeek ?? 1),
        dayOfMonth: String(existing.dayOfMonth ?? 1),
        monthOfYear: String(existing.monthOfYear ?? 1),
        startDate: existing.startDate,
        endDate: existing.endDate ?? '',
        categoryId: existing.categoryId,
        accountId: existing.accountId,
        note: existing.note ?? '',
      }
    : {
        name: '',
        type: 'expense',
        amount: '',
        frequency: 'monthly',
        dayOfWeek: '1',
        dayOfMonth: String(partsOf(today).day),
        monthOfYear: String(partsOf(today).month),
        startDate: today,
        endDate: '',
        categoryId: '',
        accountId: '',
        note: '',
      };

  const form = useForm<TRuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues,
  });

  async function handleSubmit(values: TRuleFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null) return;

    const payload: Record<string, unknown> = {
      name: values.name,
      amountCentavos,
      frequency: values.frequency,
      startDate: values.startDate,
      endDate: values.endDate || null,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    // The API validates a discriminated union on frequency, so send only the
    // fields that frequency actually requires.
    if (values.frequency === 'weekly' || values.frequency === 'biweekly') {
      payload.dayOfWeek = Number(values.dayOfWeek);
    } else {
      payload.dayOfMonth = Number(values.dayOfMonth);
      if (values.frequency === 'yearly') {
        payload.monthOfYear = Number(values.monthOfYear);
      }
    }

    if (existing) {
      await update.mutateAsync(payload);
      toast.success('Rule updated. Existing entries were left as they were.');
    } else {
      await create.mutateAsync({ ...payload, type: values.type });
      toast.success('Rule created');
    }
    onDone();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit((v) => void handleSubmit(v))(e)}
        className="flex flex-col gap-4"
      >
        <RuleFields form={form} isEdit={Boolean(existing)} />

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

function RuleFields({
  form,
  isEdit,
}: {
  form: UseFormReturn<TRuleFormValues>;
  isEdit: boolean;
}) {
  const type = form.watch('type');
  const frequency = form.watch('frequency');

  const { data: categoryData } = useCategories({ kind: type });
  const { data: accountData } = useAccounts();

  const needsWeekday = frequency === 'weekly' || frequency === 'biweekly';

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Salary — kinsenas" autoFocus {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isEdit ? (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                form.setValue('type', t);
                form.setValue('categoryId', '');
              }}
              className={cn(
                'rounded-md py-2 text-sm font-semibold capitalize transition-colors',
                type === t
                  ? 'bg-card shadow-sm'
                  : 'text-muted-foreground hover:text-text',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

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
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Repeats</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="How often">
                    {(v) =>
                      v === 'biweekly'
                        ? 'Every 2 weeks'
                        : typeof v === 'string' && v
                          ? v.charAt(0).toUpperCase() + v.slice(1)
                          : 'How often'
                    }
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FREQUENCIES.map((fr) => (
                  <SelectItem key={fr} value={fr}>
                    {fr === 'biweekly'
                      ? 'Every 2 weeks'
                      : fr.charAt(0).toUpperCase() + fr.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {needsWeekday ? (
        <FormField
          control={form.control}
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>On</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a day">
                      {(v) =>
                        [
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                          'Sunday',
                        ][Number(v) - 1] ?? 'Pick a day'
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday',
                  ].map((d, i) => (
                    <SelectItem key={d} value={String(i + 1)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="dayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Day of month</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {frequency === 'yearly' ? (
            <FormField
              control={form.control}
              name="monthOfYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick a month">
                          {(v) =>
                            [
                              'January',
                              'February',
                              'March',
                              'April',
                              'May',
                              'June',
                              'July',
                              'August',
                              'September',
                              'October',
                              'November',
                              'December',
                            ][Number(v) - 1] ?? 'Pick a month'
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        'January',
                        'February',
                        'March',
                        'April',
                        'May',
                        'June',
                        'July',
                        'August',
                        'September',
                        'October',
                        'November',
                        'December',
                      ].map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starts</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ends (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
            <FormLabel>Account</FormLabel>
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

      {isEdit ? (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Changes apply to future entries only. Entries already created keep
          their original amounts — a raise should not rewrite last year.
        </p>
      ) : null}
    </>
  );
}

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { parsePesoInput } from '@/lib/money';
import { TransactionForm } from '@/pages/transactions/_form/TransactionForm';
import { useCreateTransaction } from '@/pages/transactions/_hooks/api';
import type { TTransactionFormValues } from '@/pages/transactions/_types';

const LAST_ACCOUNT_KEY = 'ft:lastAccountId';

/**
 * Collapsed to a single "Add" button until needed, so the day's existing entries
 * stay the focus.
 *
 * On success it RESETS AND STAYS OPEN — the point is logging lunch and coffee in
 * one sitting without reopening the form.
 */
export function QuickEntryForm({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  // Remounting the form is how react-hook-form gets reset here; the form owns
  // its state via defaultValues.
  const [formKey, setFormKey] = useState(0);
  const create = useCreateTransaction();

  const defaultValues: TTransactionFormValues = {
    type: 'expense',
    amount: '',
    txnDate: date,
    categoryId: '',
    accountId: localStorage.getItem(LAST_ACCOUNT_KEY) ?? '',
    note: '',
  };

  async function handleSubmit(values: TTransactionFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null || amountCentavos <= 0) return;

    await create.mutateAsync({
      type: values.type,
      amountCentavos,
      txnDate: values.txnDate,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    });

    localStorage.setItem(LAST_ACCOUNT_KEY, values.accountId);
    toast.success('Added');
    setFormKey((k) => k + 1);
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add to this day
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-surface-2 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold">New entry</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      </div>

      <TransactionForm
        key={formKey}
        mode="create"
        compact
        defaultValues={defaultValues}
        loading={create.isPending}
        onSubmit={(v) => void handleSubmit(v)}
      />
    </div>
  );
}

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { todayPlainDate } from '@/lib/date';
import { parsePesoInput, centavosToInputString } from '@/lib/money';
import { TransactionForm } from '@/pages/transactions/_form/TransactionForm';
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/pages/transactions/_hooks/api';
import type {
  TTransaction,
  TTransactionFormValues,
} from '@/pages/transactions/_types';

const LAST_ACCOUNT_KEY = 'ft:lastAccountId';

export type TransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  /** Prefilled date for the create case — the calendar passes the tapped day. */
  date?: string;
  existing?: TTransaction;
};

/**
 * Shared by the topbar "+ Add", the day panel, and the transactions list — three
 * call sites, which is exactly why it lives in components/ rather than inside
 * one page.
 */
export function TransactionDialog({
  open,
  onClose,
  mode,
  date,
  existing,
}: TransactionDialogProps) {
  const create = useCreateTransaction();
  const update = useUpdateTransaction(existing?.id ?? '');

  const defaultValues: TTransactionFormValues =
    mode === 'edit' && existing
      ? {
          type: existing.type,
          amount: centavosToInputString(existing.amountCentavos),
          txnDate: existing.txnDate,
          categoryId: existing.category.id,
          accountId: existing.account.id,
          note: existing.note ?? '',
        }
      : {
          type: 'expense',
          amount: '',
          txnDate: date ?? todayPlainDate(),
          categoryId: '',
          // Default to the last account used — persisted locally, not server
          // state, because it's a UI preference not a fact about the ledger.
          accountId: localStorage.getItem(LAST_ACCOUNT_KEY) ?? '',
          note: '',
        };

  async function handleSubmit(values: TTransactionFormValues) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null || amountCentavos <= 0) return;

    const payload = {
      type: values.type,
      amountCentavos,
      txnDate: values.txnDate,
      categoryId: values.categoryId,
      accountId: values.accountId,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    if (mode === 'edit' && existing) {
      await update.mutateAsync(payload);
      toast.success('Transaction updated');
    } else {
      await create.mutateAsync(payload);
      localStorage.setItem(LAST_ACCOUNT_KEY, values.accountId);
      toast.success('Transaction added');
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add transaction' : 'Edit transaction'}
          </DialogTitle>
        </DialogHeader>
        <TransactionForm
          mode={mode}
          defaultValues={defaultValues}
          loading={create.isPending || update.isPending}
          onSubmit={(v) => void handleSubmit(v)}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { todayPlainDate } from '@/lib/date';
import { overdraftRisk, type TOverdraftRisk } from '@/lib/overdraft';
import { OverdraftConfirm } from '@/components/finance/OverdraftConfirm';
import { useAccounts } from '@/pages/accounts/_hooks/api';
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
          transferAccountId: existing.transferAccount?.id ?? '',
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
          transferAccountId: '',
          note: '',
        };

  const { data: accountData } = useAccounts();
  const [pending, setPending] = useState<{
    values: TTransactionFormValues;
    risk: TOverdraftRisk;
  } | null>(null);

  /**
   * Overdraft is WARNED, never blocked: the app records what happened, and
   * refusing to save one would make the books wrong on purpose. Confirming just
   * proceeds.
   */
  async function handleSubmit(
    values: TTransactionFormValues,
    confirmed = false,
  ) {
    const amountCentavos = parsePesoInput(values.amount);
    if (amountCentavos === null || amountCentavos <= 0) return;

    if (!confirmed) {
      const risk = overdraftRisk({
        type: values.type,
        accountId: values.accountId,
        amountCentavos,
        accounts: accountData?.result ?? [],
        existing:
          mode === 'edit' && existing
            ? {
                accountId: existing.account.id,
                type: existing.type,
                amountCentavos: existing.amountCentavos,
              }
            : null,
      });
      if (risk) {
        setPending({ values, risk });
        return;
      }
    }

    // Send only the fields this type owns; the API rejects the wrong shape.
    const payload =
      values.type === 'transfer'
        ? {
            type: 'transfer' as const,
            amountCentavos,
            txnDate: values.txnDate,
            accountId: values.accountId,
            transferAccountId: values.transferAccountId,
            note: values.note?.trim() ? values.note.trim() : null,
          }
        : {
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
    setPending(null);
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

        {/* Editing a generated row changes THIS occurrence only. Saying so
            matters because the row is otherwise indistinguishable from a manual
            one, and the natural assumption is that it edits the rule. */}
        {mode === 'edit' && existing?.recurringRuleId ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Created by a recurring rule. Changes here apply to{' '}
            <strong>this entry only</strong> — the rule keeps its own amount and
            schedule, and future entries are unaffected. Edit the rule itself in
            Recurring.
          </p>
        ) : null}

        <TransactionForm
          mode={mode}
          defaultValues={defaultValues}
          loading={create.isPending || update.isPending}
          onSubmit={(v) => void handleSubmit(v)}
          onCancel={onClose}
        />
      </DialogContent>

      <OverdraftConfirm
        risk={pending?.risk ?? null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void handleSubmit(pending.values, true);
        }}
      />
    </Dialog>
  );
}

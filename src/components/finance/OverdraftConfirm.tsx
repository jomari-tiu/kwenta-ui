import { ConfirmDialog } from './ConfirmDialog';
import { formatPeso } from '@/lib/money';
import type { TOverdraftRisk } from '@/lib/overdraft';

export type OverdraftConfirmProps = {
  risk: TOverdraftRisk | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * "This will overdraw the account — save anyway?"
 *
 * Deliberately a CONFIRM, not a rejection. You may genuinely have overdrawn, or
 * simply not logged the income yet, and a tracker that refuses to record what
 * happened is worse than one showing a negative number. The far more common
 * cause is a mis-tapped account, which is exactly what this catches.
 *
 * The confirm label says "Save anyway" rather than "OK" so the consequence is
 * legible without re-reading the body.
 */
export function OverdraftConfirm({
  risk,
  onCancel,
  onConfirm,
}: OverdraftConfirmProps) {
  return (
    <ConfirmDialog
      open={risk !== null}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={
        risk?.wasAlreadyNegative
          ? `${risk.accountName} is already overdrawn`
          : `This overdraws ${risk?.accountName ?? 'the account'}`
      }
      description={
        risk
          ? `${risk.accountName} holds ${formatPeso(risk.currentCentavos)}. ` +
            `Recording this leaves it at ${formatPeso(risk.projectedCentavos)}. ` +
            `If that is not right, the account on this entry is the usual culprit.`
          : ''
      }
      confirmLabel="Save anyway"
    />
  );
}

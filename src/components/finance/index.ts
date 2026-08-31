/**
 * App-specific finance components.
 *
 * Everything here is genuinely domain logic (money formatting, budget meters,
 * charts) — NOT a wrapper around a shadcn primitive. For buttons, dialogs,
 * selects, tables and the rest, import from `@/components/ui/*` directly, the
 * same way the shadcn docs show.
 */
export { AmountText } from './AmountText';
export type { AmountTextProps } from './AmountText';

export { amountPropsFor, fundSignedCentavos } from './amountSign';

export { MoneyInput } from './MoneyInput';
export type { MoneyInputProps } from './MoneyInput';

export { Meter } from './Meter';
export type { MeterProps } from './Meter';

export { ChartFrame } from './ChartFrame';
export type { ChartFrameProps } from './ChartFrame';

export { RankedBarList } from './RankedBarList';
export type { RankedBarListProps, RankedBarItem } from './RankedBarList';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { EmptyState, ErrorState } from './States';
export type { EmptyStateProps, ErrorStateProps } from './States';

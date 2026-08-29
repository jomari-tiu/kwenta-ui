import { describe, expect, it } from 'vitest';
import { overdraftRisk } from './overdraft';

const ACCOUNTS = [
  { id: 'cash', name: 'Cash', kind: 'cash', currentBalanceCentavos: 100000 },
  { id: 'red', name: 'Red', kind: 'bank', currentBalanceCentavos: -50000 },
  {
    id: 'card',
    name: 'BPI Credit Card',
    kind: 'credit_card',
    currentBalanceCentavos: 0,
  },
];

const base = { accounts: ACCOUNTS, type: 'expense' as const };

describe('overdraftRisk', () => {
  it('is silent when the balance covers the expense', () => {
    expect(
      overdraftRisk({ ...base, accountId: 'cash', amountCentavos: 100000 }),
    ).toBeNull();
  });

  it('warns when the expense goes one centavo past the balance', () => {
    const risk = overdraftRisk({
      ...base,
      accountId: 'cash',
      amountCentavos: 100001,
    });
    expect(risk).not.toBeNull();
    expect(risk?.projectedCentavos).toBe(-1);
    expect(risk?.wasAlreadyNegative).toBe(false);
  });

  it('never warns on income', () => {
    expect(
      overdraftRisk({
        ...base,
        type: 'income',
        accountId: 'cash',
        amountCentavos: 999999,
      }),
    ).toBeNull();
  });

  // A card is designed to go negative; warning would fire on correct use.
  it('never warns on a credit card', () => {
    expect(
      overdraftRisk({ ...base, accountId: 'card', amountCentavos: 500000 }),
    ).toBeNull();
  });

  it('flags an account that was already negative', () => {
    const risk = overdraftRisk({
      ...base,
      accountId: 'red',
      amountCentavos: 10000,
    });
    expect(risk?.wasAlreadyNegative).toBe(true);
    expect(risk?.projectedCentavos).toBe(-60000);
  });

  // The edit case: the row being replaced must be backed out first, or
  // REDUCING an expense would look like spending all over again.
  it('backs out the edited row before projecting', () => {
    expect(
      overdraftRisk({
        ...base,
        accountId: 'cash',
        amountCentavos: 120000,
        existing: {
          accountId: 'cash',
          type: 'expense',
          amountCentavos: 150000,
        },
      }),
    ).toBeNull();
  });

  it('does not back out an edit that moved to a different account', () => {
    const risk = overdraftRisk({
      ...base,
      accountId: 'cash',
      amountCentavos: 120000,
      existing: { accountId: 'red', type: 'expense', amountCentavos: 150000 },
    });
    expect(risk?.projectedCentavos).toBe(-20000);
  });

  it('is silent for an unknown account rather than guessing', () => {
    expect(
      overdraftRisk({ ...base, accountId: 'nope', amountCentavos: 1 }),
    ).toBeNull();
  });

  it('ignores a zero or negative amount', () => {
    expect(
      overdraftRisk({ ...base, accountId: 'red', amountCentavos: 0 }),
    ).toBeNull();
  });
});

describe('overdraftRisk — transfers', () => {
  // A transfer drains the source account exactly like an expense.
  it('warns when a transfer out would overdraw the source', () => {
    const risk = overdraftRisk({
      accounts: ACCOUNTS,
      type: 'transfer',
      accountId: 'cash',
      amountCentavos: 150000,
    });
    expect(risk?.projectedCentavos).toBe(-50000);
  });

  it('is silent when the source can cover the transfer', () => {
    expect(
      overdraftRisk({
        accounts: ACCOUNTS,
        type: 'transfer',
        accountId: 'cash',
        amountCentavos: 100000,
      }),
    ).toBeNull();
  });
});

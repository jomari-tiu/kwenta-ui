import type { TAccountFormValues } from './_types';

export const INIT_ACCOUNT: TAccountFormValues = {
  name: '',
  kind: 'cash',
  icon: 'wallet',
  color: '#16a34a',
  openingBalance: '',
  creditLimit: '',
  isDefault: false,
};

export const ACCOUNT_ICONS = [
  'wallet',
  'smartphone',
  'landmark',
  'credit-card',
  'piggy-bank',
  'banknote',
  'briefcase',
  'store',
];

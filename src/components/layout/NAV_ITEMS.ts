import {
  CalendarDays,
  ChartPie,
  CreditCard,
  ListOrdered,
  Receipt,
  HandCoins,
  PiggyBank,
  Repeat,
  Tags,
  Target,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type TNavItem = {
  key: string;
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  section: 'main' | 'setup';
  /** Shown in the mobile bottom tab bar. */
  isPrimary?: boolean;
};

/**
 * Single source of truth for navigation. The sidebar renders all of it grouped
 * by section; MobileTabBar renders the three `isPrimary` entries plus "More".
 * The page title also derives from here, so there is no separate title map to
 * forget to update.
 */
export const NAV_ITEMS: TNavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: ChartPie,
    section: 'main',
    isPrimary: true,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    to: '/calendar',
    icon: CalendarDays,
    section: 'main',
    isPrimary: true,
  },
  {
    key: 'transactions',
    label: 'Transactions',
    to: '/transactions',
    icon: ListOrdered,
    section: 'main',
    isPrimary: true,
  },
  {
    key: 'installments',
    label: 'Installments',
    to: '/installments',
    icon: Receipt,
    section: 'main',
  },
  {
    key: 'credit-loans',
    label: 'Credit Loans',
    to: '/credit-loans',
    icon: HandCoins,
    section: 'main',
  },
  {
    key: 'investments',
    label: 'Investments',
    to: '/investments',
    icon: PiggyBank,
    section: 'main',
  },
  {
    key: 'recurring',
    label: 'Recurring',
    to: '/recurring-rules',
    icon: Repeat,
    section: 'main',
  },
  {
    key: 'budgets',
    label: 'Budgets',
    to: '/budgets',
    icon: Target,
    section: 'setup',
  },
  {
    key: 'categories',
    label: 'Categories',
    to: '/categories',
    icon: Tags,
    section: 'setup',
  },
  {
    key: 'accounts',
    label: 'Accounts',
    to: '/accounts',
    icon: Wallet,
    section: 'setup',
  },
];

export const SETUP_ICON = CreditCard;

export function navItemForPath(pathname: string): TNavItem | undefined {
  return NAV_ITEMS.find(
    (i) => pathname === i.to || pathname.startsWith(`${i.to}/`),
  );
}

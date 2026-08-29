import {
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  ChartLine,
  CircleDollarSign,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Scissors,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Tv,
  Undo2,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * A CURATED allowlist, and this matters for bundle size.
 *
 * lucide-react ships ~1,500 icons. A picker over all of them — or a
 * CategoryIcon that resolves names dynamically — defeats tree-shaking and pulls
 * the entire library in (hundreds of KB). These are explicit named imports, so
 * only these ~40 reach the bundle. The category row stores the NAME string.
 */
export const CATEGORY_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  bus: Bus,
  wifi: Wifi,
  zap: Zap,
  house: House,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  scissors: Scissors,
  tv: Tv,
  'graduation-cap': GraduationCap,
  users: Users,
  shield: Shield,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  receipt: Receipt,
  heart: Heart,
  'paw-print': PawPrint,
  landmark: Landmark,
  ellipsis: Ellipsis,
  banknote: Banknote,
  gift: Gift,
  'trending-up': TrendingUp,
  laptop: Laptop,
  store: Store,
  'chart-line': ChartLine,
  'undo-2': Undo2,
  'hand-coins': HandCoins,
  plus: Plus,
  wallet: Wallet,
  smartphone: Smartphone,
  plane: Plane,
  shirt: Shirt,
  dumbbell: Dumbbell,
  briefcase: Briefcase,
  'book-open': BookOpen,
  ticket: Ticket,
  wrench: Wrench,
  sparkles: Sparkles,
  'circle-dollar-sign': CircleDollarSign,
};

export type TCategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

/**
 * Twelve curated swatches beats a full colour wheel: consistent-looking chips,
 * and nobody picks #fefefe.
 */
export const CATEGORY_COLORS = [
  '#dc2626',
  '#ea580c',
  '#f59e0b',
  '#eab308',
  '#16a34a',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

export const INIT_CATEGORY = {
  name: '',
  icon: 'ellipsis',
  color: '#64748b',
  monthlyBudget: '',
};

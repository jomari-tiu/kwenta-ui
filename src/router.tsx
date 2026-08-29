/* eslint-disable react-refresh/only-export-components -- this file exports a
   route table, not components; HMR boundaries do not apply. */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { RouteError } from '@/components/RouteError';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Data router, with ZERO loaders or actions.
 *
 * We get errorElement per route, nested layouts and lazy code-splitting, while
 * React Query stays the only owner of server state. Loaders would create a
 * second parallel fetching system with its own cache and revalidation story —
 * reconciling the two is the standard failure mode of react-router + React
 * Query projects.
 *
 * RULE: routes never fetch. `loader` and `action` are banned.
 */
const LoginPage = lazy(() => import('@/pages/login/LoginPage'));
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage'));
const TransactionsPage = lazy(
  () => import('@/pages/transactions/TransactionsPage'),
);
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const InstallmentsPage = lazy(
  () => import('@/pages/installments/InstallmentsPage'),
);
const InstallmentDetailPage = lazy(
  () => import('@/pages/installments/InstallmentDetailPage'),
);
const CreditLoansPage = lazy(
  () => import('@/pages/credit-loans/CreditLoansPage'),
);
const RecurringRulesPage = lazy(
  () => import('@/pages/recurring-rules/RecurringRulesPage'),
);
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'));
const BudgetsPage = lazy(() => import('@/pages/budgets/BudgetsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

function PageFallback() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function page(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: page(<LoginPage />),
    errorElement: <RouteError />,
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/calendar" replace /> },
          { path: '/calendar', element: page(<CalendarPage />) },
          { path: '/transactions', element: page(<TransactionsPage />) },
          { path: '/dashboard', element: page(<DashboardPage />) },
          // Static segments before /:id — unlike Next's file routing this is an
          // ordering concern you have to remember.
          { path: '/installments', element: page(<InstallmentsPage />) },
          {
            path: '/installments/:id',
            element: page(<InstallmentDetailPage />),
          },
          { path: '/credit-loans', element: page(<CreditLoansPage />) },
          { path: '/recurring-rules', element: page(<RecurringRulesPage />) },
          { path: '/budgets', element: page(<BudgetsPage />) },
          { path: '/categories', element: page(<CategoriesPage />) },
          { path: '/accounts', element: page(<AccountsPage />) },
          { path: '*', element: page(<NotFoundPage />) },
        ],
      },
    ],
  },
]);

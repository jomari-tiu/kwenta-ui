import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { LogOut, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TransactionDialog } from '@/components/TransactionDialog';
import { clearToken } from '@/lib/auth';
import { AppSidebar } from './AppSidebar';
import { MobileTabBar } from './MobileTabBar';
import { navItemForPath } from './NAV_ITEMS';

export function AppShell() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const title = navItemForPath(pathname)?.label ?? 'Finance';

  function handleLogout() {
    clearToken();
    queryClient.clear();
    // Hard navigation so no in-memory state survives the logout.
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
          <h1 className="truncate text-lg font-bold text-heading">{title}</h1>

          <div className="flex items-center gap-1.5">
            {/* The app's most frequent action. It should never require
                navigating somewhere first. */}
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* pb-20 clears the mobile tab bar. */}
        <main className="min-w-0 flex-1 p-4 pb-20 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileTabBar />

      <TransactionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="create"
      />
    </div>
  );
}

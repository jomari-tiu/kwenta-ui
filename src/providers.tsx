import { useState, type ReactNode } from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { extractErrorMessages } from '@/lib/api';
import { toast } from 'sonner';

function showErrorToast(error: unknown): void {
  const [first, ...rest] = extractErrorMessages(error);
  toast.error(first ?? 'Something went wrong', {
    description: rest.length > 0 ? rest.join(' · ') : undefined,
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // Mobile Safari fires focus on every app switch. Refetching on each
            // one is pure noise for a single-user app.
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: 1500,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Only surface failures for queries that already have data on
            // screen; a first-load failure is handled by the page's ErrorState.
            if (query.state.data !== undefined) showErrorToast(error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => showErrorToast(error),
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* next-themes has no Next dependency — it is context + localStorage + a
          class on <html>, and works unchanged in a Vite SPA. */}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

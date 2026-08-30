import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react';
import { AmountText, ErrorState } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { TransactionDialog } from '@/components/TransactionDialog';
import { useIsMobile } from '@/hooks/useMobile';
import { formatMonthKey, currentMonthKey } from '@/lib/date';
import type { TTransaction } from '@/pages/transactions/_types';
import { useCalendarMonth } from './_hooks/api';
import { useCalendarUrlState } from './_hooks/useCalendarUrlState';
import { MonthGrid, MonthGridSkeleton } from './_components/MonthGrid';
import { DayPanel } from './_components/DayPanel';

export default function CalendarPage() {
  const { monthKey, selectedDate, stepMonth, goToToday, openDay, closeDay } =
    useCalendarUrlState();

  const isMobile = useIsMobile();
  const [editing, setEditing] = useState<TTransaction | null>(null);
  const [narrow, setNarrow] = useState(false);

  // Below ~380px the cells cannot fit amounts, so they fall back to dots. The
  // overdue ring is never dropped at any width.
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 380);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { data, isPending, isError, refetch, isFetching } =
    useCalendarMonth(monthKey);

  const month = data?.result;
  const selectedDay = month?.days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-40 px-1 text-center text-base font-bold sm:min-w-48 sm:text-lg">
            {formatMonthKey(monthKey)}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            disabled={monthKey === currentMonthKey()}
          >
            Today
          </Button>
        </div>

        {month ? (
          <dl className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <dt className="text-text-muted">In</dt>
              <dd>
                <AmountText
                  centavos={month.totals.incomeCentavos}
                  kind="income"
                  rounded
                />
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-text-muted">Out</dt>
              <dd>
                <AmountText
                  centavos={month.totals.expenseCentavos}
                  kind="expense"
                  rounded
                />
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="flex items-center gap-1 text-text-muted">
                <PiggyBank className="size-3.5 text-good" aria-hidden />
                Saved
              </dt>
              <dd>
                <AmountText centavos={month.totals.savedCentavos} rounded />
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-text-muted">Net</dt>
              <dd>
                <AmountText
                  centavos={month.totals.netCentavos}
                  kind="net"
                  rounded
                />
              </dd>
            </div>
          </dl>
        ) : null}
      </header>

      {isError ? (
        <ErrorState
          title="Could not load the calendar"
          retry={() => void refetch()}
        />
      ) : isPending && !month ? (
        <MonthGridSkeleton />
      ) : month ? (
        <div className="relative">
          {/* With keepPreviousData the old month stays visible while the next
              loads — much calmer than blanking to a skeleton on every press. */}
          {isFetching ? (
            <div
              aria-hidden
              className="absolute inset-x-0 -top-1 h-0.5 overflow-hidden rounded-full bg-primary/20"
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          ) : null}

          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
            <MonthGrid
              days={month.days}
              selectedDate={selectedDate}
              compact={narrow}
              onSelect={openDay}
            />
          </div>

          {month.totals.incomeCentavos === 0 &&
          month.totals.expenseCentavos === 0 &&
          month.totals.savedCentavos === 0 ? (
            <p className="mt-3 text-center text-sm text-text-muted">
              No activity in {formatMonthKey(monthKey)}. Tap a day to add
              something.
            </p>
          ) : null}
        </div>
      ) : null}

      <DayPanel
        day={selectedDay}
        open={selectedDate !== null && selectedDay !== null}
        isMobile={isMobile}
        onClose={closeDay}
        onEditTransaction={setEditing}
      />

      {editing ? (
        <TransactionDialog
          open
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

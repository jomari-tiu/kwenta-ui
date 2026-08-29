import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NAV_ITEMS } from './NAV_ITEMS';

/**
 * Bottom tab bar, below md.
 *
 * Bottom placement is thumb-reachable; a hamburger in the top-left is the worst
 * possible location on a 6-inch phone. The safe-area padding is a legitimate
 * arbitrary value — env() has no Tailwind token.
 */
export function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const primary = NAV_ITEMS.filter((i) => i.isPrimary);
  const rest = NAV_ITEMS.filter((i) => !i.isPrimary);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {primary.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    // 44px minimum tap target.
                    'flex min-h-14 flex-col items-center justify-center gap-1 text-2xs font-semibold transition-colors',
                    isActive ? 'text-primary' : 'text-text-muted',
                  )
                }
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-2xs font-semibold text-text-muted"
            >
              <Ellipsis className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>

          <ul className="flex flex-col gap-1 px-4 pb-6">
            {rest.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void navigate(item.to);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium hover:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

import { NavLink } from 'react-router';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './NAV_ITEMS';

function Section({
  items,
  label,
}: {
  items: typeof NAV_ITEMS;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label ? (
        <p className="px-3 pt-4 pb-1 text-2xs font-bold tracking-widest text-text-faint uppercase">
          {label}
        </p>
      ) : null}
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground hover:bg-muted hover:text-text',
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

/** Desktop sidebar. Hidden below md, where MobileTabBar takes over. */
export function AppSidebar() {
  const main = NAV_ITEMS.filter((i) => i.section === 'main');
  const setup = NAV_ITEMS.filter((i) => i.section === 'setup');

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <Wallet className="size-4" />
        </span>
        <span className="font-bold text-heading">Finance</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <Section items={main} />
        <Section items={setup} label="Setup" />
      </nav>
    </aside>
  );
}

import { cn } from '@/lib/utils';
import { CATEGORY_ICONS } from '@/pages/categories/_constant';

export type CategoryIconProps = {
  /** A name from the curated allowlist. Unknown names fall back. */
  name: string | null | undefined;
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const BOX = { sm: 'size-6', md: 'size-8', lg: 'size-10' } as const;
const GLYPH = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const;

/**
 * Name -> component via a static record. Never a dynamic import or an index
 * into the whole lucide namespace, which would defeat tree-shaking.
 */
export function CategoryIcon({
  name,
  color,
  size = 'md',
  className,
}: CategoryIconProps) {
  const Glyph = (name && CATEGORY_ICONS[name]) || CATEGORY_ICONS.ellipsis;
  const tint = color ?? 'var(--text-muted)';

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full',
        BOX[size],
        className,
      )}
      style={{ background: `${tint}1f`, color: tint }}
    >
      <Glyph className={GLYPH[size]} />
    </span>
  );
}

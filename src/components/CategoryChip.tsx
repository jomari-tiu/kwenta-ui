import { cn } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';

export type CategoryChipProps = {
  name: string;
  icon?: string | null;
  color?: string | null;
  className?: string;
};

export function CategoryChip({
  name,
  icon,
  color,
  className,
}: CategoryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-sm',
        className,
      )}
    >
      <CategoryIcon name={icon} color={color} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  );
}

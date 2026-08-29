import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional Tailwind classes. Use for ALL conditional class composition. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

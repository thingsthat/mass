import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind-aware deduplication (later classes override conflicting earlier ones).
 * Used by shadcn-vue and AI Elements Vue components.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

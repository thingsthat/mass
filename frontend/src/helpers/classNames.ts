import { type ClassValue, clsx } from 'clsx';

/**
 * Merges class names with a custom strategy that respects CSS specificity and order.
 * Uses clsx for conditional class name handling.
 */
export function cn(...inputs: ClassValue[]) {
  // Process inputs through clsx first to handle conditionals
  const classNames = clsx(inputs);

  // Split into individual classes
  const classes = classNames.split(' ').filter(Boolean);

  // Create a map to store the final classes, where later classes with the same base override earlier ones
  const finalClasses = new Map<string, string>();

  classes.forEach(className => {
    // Handle state/modifier classes (those with : or --)
    if (className.includes(':') || className.includes('--')) {
      finalClasses.set(className, className);
      return;
    }

    // For base classes, extract the core part (before any modifiers)
    const baseClass = className.split(':')[0].split('--')[0];
    finalClasses.set(baseClass, className);
  });

  return Array.from(finalClasses.values()).join(' ');
}

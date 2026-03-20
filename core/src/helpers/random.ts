/**
 * Weighted random selection from an array of weighted items
 */
export function weightedRandomSelect<T>(
  items: Array<{ value: T; weight: number }>,
  count: number
): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  const availableItems = [...items].filter(item => item.weight > 0);
  if (availableItems.length === 0) {
    return [];
  }

  const result: T[] = [];

  for (let i = 0; i < Math.min(count, availableItems.length); i++) {
    const totalWeight = availableItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let j = 0; j < availableItems.length; j++) {
      random -= availableItems[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    result.push(availableItems[selectedIndex].value);
    availableItems.splice(selectedIndex, 1);
  }

  return result;
}

/**
 * Get a random subset from an array
 */
export function getRandomSubset<T>(arr: readonly T[], count: number): T[] {
  if (!arr || arr.length === 0) {
    return [];
  }
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

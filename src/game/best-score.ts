import { TOTAL_PEARLS } from './model/level';

const KEY = 'little-lobster-best';

export function readBest(): number {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isInteger(value) && value >= 0 && value <= TOTAL_PEARLS
      ? value
      : 0;
  } catch {
    return 0;
  }
}

export function saveBest(pearls: number): number {
  const best = Math.max(readBest(), pearls);
  try {
    localStorage.setItem(KEY, String(best));
  } catch {
    /* Playing does not require storage access. */
  }
  return best;
}

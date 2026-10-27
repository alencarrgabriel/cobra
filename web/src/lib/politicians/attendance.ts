// Presence on the profile (change ingestao-presenca, design D4 and D5).

/** Middle value of a list (mean of the two middle ones when even). */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** "91%"; a share between 0 and 1, rounded to whole percent. */
export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

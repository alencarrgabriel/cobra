// Pure helpers for party colors, usable from tests and components (no database access).

/**
 * Color of parties without a curated one (design D3): the neutral status color of the light
 * theme, as a concrete hex because the badge computes contrast from it.
 */
export const NEUTRAL_PARTY_COLOR = "#6f706a";

/** Curated color of a party, or the neutral one; never another party's color. */
export function partyColor(
  colors: Record<string, string>,
  acronym: string,
): string {
  return colors[acronym] ?? NEUTRAL_PARTY_COLOR;
}

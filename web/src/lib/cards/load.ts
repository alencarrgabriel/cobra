import "server-only";

import { getPlace } from "@/lib/places/queries";
import { getAmendments, getPolitician } from "@/lib/politicians/queries";
import {
  getHouseUpdates,
  getRepresentatives,
  type House,
} from "@/lib/representatives/queries";
import { getVote } from "@/lib/votes/queries";
import { getWork } from "@/lib/works/queries";

import {
  type CardContent,
  placeCard,
  politicianCard,
  voteCard,
  workCard,
} from "./content";

// Card data from Cobra's own database, through the same cached reads as the pages (design D1).

export async function politicianCardContent(
  id: string,
): Promise<CardContent | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  const p = await getPolitician(Number(id));
  if (!p) return null;
  const amendments = await getAmendments(p.id);
  return politicianCard(p, {
    count: amendments.length,
    committed: amendments.reduce((s, a) => s + a.committed, 0),
  });
}

export async function placeCardContent(
  code: string,
): Promise<CardContent | null> {
  if (!/^\d{2}(\d{5})?$/.test(code)) return null;
  const place = await getPlace(code);
  if (!place) return null;
  const [people, updates] = await Promise.all([
    getRepresentatives(place.ufCode),
    getHouseUpdates(),
  ]);
  const counts: Partial<Record<House, number>> = {};
  for (const person of people)
    counts[person.house] = (counts[person.house] ?? 0) + 1;
  const dates = updates
    .filter((u) => counts[u.house] && u.collectedAt)
    .map((u) => u.collectedAt!)
    .sort();
  return placeCard(place, counts, dates.at(-1) ?? null);
}

export async function voteCardContent(id: string): Promise<CardContent | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  const vote = await getVote(Number(id));
  return vote ? voteCard(vote) : null;
}

export async function workCardContent(
  code: string,
  today: Date,
): Promise<CardContent | null> {
  const work = await getWork(code);
  return work ? workCard(work, today) : null;
}

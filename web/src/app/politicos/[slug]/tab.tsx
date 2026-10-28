import type { Metadata } from "next";

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { shareMetadata } from "@/lib/cards/metadata";
import { getPolitician, type Politician } from "@/lib/politicians/queries";
import { profilePath } from "@/lib/politicians/who";

import { DESCRIPTION, idOf, sentence, TABS, type TabKey } from "./shared";

// Helpers shared by the tabs of a profile (change perfil-em-abas-e-jornada, design D1).

export type Mandate = Politician["mandates"][number];

/** Runs a read; `null` when the database is unavailable (the page then explains it). */
export async function safe<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (isDataUnavailable(error)) return null;
    throw error;
  }
}

/** The politician of the address and the mandate shown (current, or the latest). */
export async function profileOf(
  params: Promise<{ slug: string }>,
): Promise<{ p: Politician; current: Mandate | undefined } | null> {
  const id = idOf((await params).slug);
  if (!Number.isFinite(id)) return null;
  const p = await safe(() => getPolitician(id));
  if (!p) return null;
  return {
    p,
    current: p.mandates.find((m) => m.endedOn === null) ?? p.mandates[0],
  };
}

/** Title, description and link preview of a tab; the card is the profile's. */
export async function tabMetadata(
  params: Promise<{ slug: string }>,
  tab: TabKey,
): Promise<Metadata> {
  const id = idOf((await params).slug);
  const p = Number.isFinite(id) ? await safe(() => getPolitician(id)) : null;
  if (!p) return { title: "Perfil", description: DESCRIPTION };
  const label = TABS.find((t) => t.key === tab)!.label;
  return shareMetadata({
    title: tab ? `${p.name}: ${label}` : p.name,
    description: sentence(p),
    path: tab
      ? `${profilePath(p.id, p.name)}/${tab}`
      : profilePath(p.id, p.name),
    card: ["politico", p.id, "link"],
    type: "profile",
  });
}

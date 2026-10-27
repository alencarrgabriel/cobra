import "server-only";

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { siteUrl } from "@/lib/site";

import type { CardContent } from "./content";
import { isCardFormat } from "./formats";
import { renderCard } from "./render";

// Answer of every card route (design D1): 404 for an unknown code or format, 503 while the
// database is unavailable, and a PNG kept for an hour otherwise.

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export async function cardResponse(
  format: string,
  load: () => Promise<CardContent | null>,
): Promise<Response> {
  if (!isCardFormat(format)) return text("Formato desconhecido.", 404);
  let content: CardContent | null;
  try {
    content = await load();
  } catch (error) {
    if (isDataUnavailable(error))
      return text("Dados indisponíveis no momento.", 503);
    throw error;
  }
  if (!content) return text("Não encontrado.", 404);
  return renderCard(content, format, siteUrl().host, {
    "Cache-Control": "public, max-age=3600",
  });
}

import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";

// Data shown on the methodology page (change metodologia, design D2): read from the
// database so it never drifts from what the collectors actually did.

export type Methodology = {
  /** Last collection per source (`core.data_source`), ISO timestamp. */
  lastCollected: Record<string, string>;
  themes: { slug: string; label: string; keywords: string[] }[];
};

async function cachedMethodology(): Promise<DbResult<Methodology>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [collected, themes] = await Promise.all([
      sql<{ source: string; at: string }[]>`
        select source::text, max(at)::text as at from (
          select source, max(collected_at) as at from core.politicians group by source
          union all select source, max(collected_at) from core.votes group by source
          union all select source, max(collected_at) from core.expenses group by source
          union all select source, max(collected_at) from core.sessions group by source
          union all select source, max(collected_at) from core.works group by source
          union all select source, max(collected_at) from core.amendments group by source
          union all select source, max(collected_at) from core.candidacies group by source
          union all select source, max(collected_at) from core.government_plans group by source
          union all select source, max(collected_at) from core.localities group by source
        ) t
        where source <> 'cobra'
        group by source`,
      sql<{ slug: string; label: string; keywords: string[] }[]>`
        select slug, label, keywords from core.plan_themes
        order by label collate "und-x-icu"`,
    ]);
    return {
      lastCollected: Object.fromEntries(collected.map((r) => [r.source, r.at])),
      themes,
    };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getMethodology(): Promise<Methodology> {
  return unwrap(await cachedMethodology());
}

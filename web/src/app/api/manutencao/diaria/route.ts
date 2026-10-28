import { createHash, timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { serverEnv } from "@/config/env";
import { alertTeam } from "@/lib/health/queries";
import { purgeExpiredEmails } from "@/lib/reports/queries";

// Daily maintenance (change reporte-de-erro, design D6): erases the e-mail of reports closed
// more than 90 days ago, and alerts the team about failing or late integrations (change
// saude-integracoes). Same `Authorization: Bearer <CRON_SECRET>` as the weekly summary.

function authorized(request: Request, secret: string): boolean {
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(
    digest(request.headers.get("authorization") ?? ""),
    digest(`Bearer ${secret}`),
  );
}

async function run(request: Request): Promise<Response> {
  await connection();
  const secret = serverEnv().CRON_SECRET;
  if (!secret || !authorized(request, secret)) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json(
    {
      emailsApagados: await purgeExpiredEmails(),
      integracoesComProblema: await alertTeam(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = run;
export const POST = run;

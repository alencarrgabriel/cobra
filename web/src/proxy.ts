import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { authConfig } from "@/lib/editorial/supabase";
import { placeExists } from "@/lib/places/exists";
import { planExists } from "@/lib/plans/exists";
import { politicianName } from "@/lib/politicians/exists";
import { profilePath } from "@/lib/politicians/who";
import { voteExists } from "@/lib/votes/exists";
import { workExists } from "@/lib/works/exists";

// Pages with a code in the address stream after a static shell, so `notFound()` there can no
// longer change the status. Unknown codes are answered here, before rendering, with a real
// 404 (specs obras-na-cidade, busca-de-representantes, perfil-do-politico and
// tela-de-planos-de-governo).
const CHECKS: [
  prefix: string,
  exists: (code: string) => Promise<boolean | null>,
][] = [
  ["/obras/", workExists],
  ["/representantes/", placeExists],
  ["/planos/", planExists],
  ["/votacoes/", voteExists],
];

const notFound = (request: NextRequest) =>
  // No route answers this path, so the site's "não encontrada" page renders with status 404.
  NextResponse.rewrite(new URL("/_nao-encontrada", request.url));

function decoded(path: string, prefix: string): string {
  try {
    return decodeURIComponent(path.slice(prefix.length));
  } catch {
    return ""; // malformed escape: treated as an unknown code
  }
}

async function profile(request: NextRequest, slug: string) {
  const match = /^(\d{1,12})(?:-|$)/.exec(slug);
  if (!match) return notFound(request);
  const id = Number(match[1]);
  const name = await politicianName(id);
  if (name === undefined) return NextResponse.next(); // database down: the page explains
  if (name === null) return notFound(request);
  const canonical = profilePath(id, name);
  if (request.nextUrl.pathname !== canonical) {
    // The id decides; an old or wrong name in the address goes to the current one (D1).
    return NextResponse.redirect(new URL(canonical, request.url), 308);
  }
  return NextResponse.next();
}

// Editorial panel (change painel-editorial, design D1): refreshes the editor's session and
// sends to the missing step. Pages and actions check the editor again; this is only the door.
const PANEL_OPEN = new Set(["/painel/entrar", "/painel/indisponivel"]);

async function panel(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const config = authConfig();
  if (!config) {
    return path === "/painel/indisponivel"
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/painel/indisponivel", request.url));
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list)
          response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const go = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    return redirect;
  };
  if (PANEL_OPEN.has(path)) return response;
  if (!data.user) return go("/painel/entrar");
  if (path !== "/painel/codigo" && path !== "/painel/sem-acesso") {
    const { data: level } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.currentLevel !== "aal2") return go("/painel/codigo");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/painel" || path.startsWith("/painel/")) return panel(request);
  if (path.startsWith("/politicos/")) {
    return profile(request, decoded(path, "/politicos/"));
  }
  const check = CHECKS.find(([prefix]) => path.startsWith(prefix));
  if (!check) return NextResponse.next();
  if ((await check[1](decoded(path, check[0]))) === false)
    return notFound(request);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/obras/:codigo",
    "/representantes/:codigo",
    "/politicos/:slug",
    "/planos/:plano",
    "/votacoes/:id",
    "/painel",
    "/painel/:path*",
  ],
};

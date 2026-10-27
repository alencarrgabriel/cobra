import { type NextRequest, NextResponse } from "next/server";

import { placeExists } from "@/lib/places/exists";
import { workExists } from "@/lib/works/exists";

// Pages with a code in the address stream after a static shell, so `notFound()` there can no
// longer change the status. Unknown codes are answered here, before rendering, with a real
// 404 (specs obras-na-cidade and busca-de-representantes).
const CHECKS: [
  prefix: string,
  exists: (code: string) => Promise<boolean | null>,
][] = [
  ["/obras/", workExists],
  ["/representantes/", placeExists],
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const check = CHECKS.find(([prefix]) => path.startsWith(prefix));
  if (!check) return NextResponse.next();
  let code = "";
  try {
    code = decodeURIComponent(path.slice(check[0].length));
  } catch {
    // Malformed escape: treated as an unknown code.
  }
  if ((await check[1](code)) === false) {
    // No route answers this path, so the site's "não encontrada" page renders with status 404.
    return NextResponse.rewrite(new URL("/_nao-encontrada", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/obras/:codigo", "/representantes/:codigo"],
};

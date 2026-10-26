import { type NextRequest, NextResponse } from "next/server";

import { workExists } from "@/lib/works/exists";

// The work page streams after a static shell, so `notFound()` there can no longer change the
// status. Unknown codes are answered here, before rendering, with a real 404 (spec
// obras-na-cidade, "Código inexistente").
export async function proxy(request: NextRequest) {
  let code = "";
  try {
    code = decodeURIComponent(request.nextUrl.pathname.slice("/obras/".length));
  } catch {
    // Malformed escape: treated as an unknown code.
  }
  if ((await workExists(code)) === false) {
    // No route answers this path, so the site's "não encontrada" page renders with status 404.
    return NextResponse.rewrite(new URL("/_obra-nao-encontrada", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/obras/:codigo",
};

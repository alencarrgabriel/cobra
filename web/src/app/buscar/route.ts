import { NextResponse } from "next/server";

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { placeLookup } from "@/lib/places/queries";
import { resolve } from "@/lib/places/resolve";

// "CEP, cidade ou UF" form (change busca-geografica, design D3). The text arrives in the
// POST body, is turned into an IBGE code and discarded: it is never logged, stored or put in
// an address. Only city names (not personal data) may appear in the "choose" address.
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const text = String(form.get("q") ?? "").slice(0, 120);
  let target: string;
  try {
    const result = await resolve(text, placeLookup);
    target =
      result.kind === "place"
        ? `/representantes/${result.code}`
        : result.kind === "choose"
          ? `/representantes?escolher=${encodeURIComponent(result.query)}`
          : "/representantes?erro=nao-encontrado";
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
    target = "/representantes?erro=indisponivel";
  }
  return NextResponse.redirect(new URL(target, request.url), 303);
}

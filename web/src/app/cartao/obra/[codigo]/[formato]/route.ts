import { connection } from "next/server";

import { workCardContent } from "@/lib/cards/load";
import { cardResponse } from "@/lib/cards/respond";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/cartao/obra/[codigo]/[formato]">,
) {
  const { codigo, formato } = await params;
  // "há N meses" depends on today's date.
  await connection();
  return cardResponse(formato, () => workCardContent(codigo, new Date()));
}

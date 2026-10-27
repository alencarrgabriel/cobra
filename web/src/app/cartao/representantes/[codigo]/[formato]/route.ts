import { placeCardContent } from "@/lib/cards/load";
import { cardResponse } from "@/lib/cards/respond";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/cartao/representantes/[codigo]/[formato]">,
) {
  const { codigo, formato } = await params;
  return cardResponse(formato, () => placeCardContent(codigo));
}

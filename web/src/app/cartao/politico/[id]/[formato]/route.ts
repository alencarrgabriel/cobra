import { politicianCardContent } from "@/lib/cards/load";
import { cardResponse } from "@/lib/cards/respond";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/cartao/politico/[id]/[formato]">,
) {
  const { id, formato } = await params;
  return cardResponse(formato, () => politicianCardContent(id));
}

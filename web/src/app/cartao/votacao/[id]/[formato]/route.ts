import { voteCardContent } from "@/lib/cards/load";
import { cardResponse } from "@/lib/cards/respond";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/cartao/votacao/[id]/[formato]">,
) {
  const { id, formato } = await params;
  return cardResponse(formato, () => voteCardContent(id));
}

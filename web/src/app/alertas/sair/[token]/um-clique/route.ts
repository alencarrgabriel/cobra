import { unsubscribe } from "@/lib/alerts/service";

// One-click unsubscribe (RFC 8058): mail providers POST "List-Unsubscribe=One-Click" here,
// from the List-Unsubscribe header of the weekly summary (change resumo-semanal).
export async function POST(
  _request: Request,
  { params }: RouteContext<"/alertas/sair/[token]/um-clique">,
) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return new Response(ok ? "Descadastrado." : "Link inválido.", {
    status: ok ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}

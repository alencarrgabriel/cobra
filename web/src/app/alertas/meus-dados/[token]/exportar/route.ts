import { myData } from "@/lib/alerts/service";

// Download of everything the Cobra keeps about the person (DDR §10.2, data portability).
export async function GET(
  _request: Request,
  { params }: RouteContext<"/alertas/meus-dados/[token]/exportar">,
) {
  const { token } = await params;
  const data = await myData(token, "exportacao");
  if (!data) return new Response("Link inválido ou vencido.", { status: 404 });
  // The exit token is a link, not data about the person.
  const kept: Partial<typeof data> = { ...data };
  delete kept.unsubscribe;
  return new Response(
    JSON.stringify(
      { exportado_em: new Date().toISOString(), ...kept },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cobra-meus-dados.json"',
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { getPlanPdf } from "@/lib/plans/queries";

// The official PDF exactly as stored (change plano-de-governo, design D6).
export async function GET(
  _request: Request,
  { params }: RouteContext<"/planos/[plano]/pdf">,
) {
  const { plano } = await params;
  let pdf: Uint8Array | null;
  try {
    pdf = await getPlanPdf(plano);
  } catch (error) {
    if (isDataUnavailable(error))
      return new Response("Dados indisponíveis no momento.", { status: 503 });
    throw error;
  }
  if (!pdf) return new Response("Não encontrado.", { status: 404 });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="plano-de-governo-${plano}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

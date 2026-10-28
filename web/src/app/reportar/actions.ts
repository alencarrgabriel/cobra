"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";

import { isEmail } from "@/lib/alerts/service";
import { reportsAvailable } from "@/lib/reports/db";
import { submitReport } from "@/lib/reports/queries";
import { MAX_TEXT, MIN_TEXT, pagePath } from "@/lib/reports/rules";

// Public report form (change reporte-de-erro, design D3).

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function sendReport(form: FormData): Promise<void> {
  if (!reportsAvailable()) redirect("/reportar");
  const page = pagePath(text(form, "pagina")) ?? "/";
  const kind = text(form, "tipo") === "contestacao" ? "contestacao" : "erro";
  const back: (erro: string) => never = (erro) =>
    redirect(
      `/reportar?${new URLSearchParams({ pagina: page, tipo: kind, erro })}`,
    );
  const description = text(form, "descricao").trim();
  const email = text(form, "email").trim();
  if (description.length < MIN_TEXT) back("curto");
  if (description.length > MAX_TEXT) back("longo");
  if (email && !isEmail(email)) back("email");
  // A bot filled the hidden field: answer as if sent, keep nothing.
  if (text(form, "site")) redirect("/reportar/enviado");
  const result = await submitReport({
    pagePath: page,
    kind,
    description,
    email: email || null,
  });
  if (result === "limit") back("limite");
  updateTag("reports");
  redirect(`/reportar/enviado?protocolo=${result.id}`);
}

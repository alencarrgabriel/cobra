"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { editorDb } from "@/lib/editorial/db";
import { draftSummary } from "@/lib/editorial/draft";
import { voteForEditing } from "@/lib/editorial/queries";
import { requireEditor } from "@/lib/editorial/session";
import { authClient } from "@/lib/editorial/supabase";

// Server actions of the editorial panel (change painel-editorial). Every action that writes
// checks the editor again: the Proxy alone is not a barrier (design D1).

const MIN_TEXT = 40;
const MAX_TEXT = 4000;
const MIN_JUSTIFICATION = 20;

export async function signIn(form: FormData): Promise<void> {
  const supabase = await authClient();
  if (!supabase) redirect("/painel/indisponivel");
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) redirect("/painel/entrar?erro=credenciais");
  redirect("/painel/codigo");
}

export async function verifyCode(form: FormData): Promise<void> {
  const supabase = await authClient();
  if (!supabase) redirect("/painel/indisponivel");
  const factorId = String(form.get("factor") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) redirect("/painel/codigo?erro=codigo");
  redirect("/painel");
}

export async function signOut(): Promise<void> {
  const supabase = await authClient();
  await supabase?.auth.signOut();
  redirect("/painel/entrar");
}

function voteId(form: FormData): number {
  const id = Number(form.get("vote"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("invalid vote");
  return id;
}

export async function saveDraft(form: FormData): Promise<void> {
  const editor = await requireEditor();
  const id = voteId(form);
  const text = String(form.get("text") ?? "").trim();
  if (text.length < MIN_TEXT || text.length > MAX_TEXT) {
    redirect(`/painel/votacoes/${id}?erro=tamanho`);
  }
  await editorDb().begin(async (sql) => {
    const [row] = await sql<{ version: number }[]>`
      insert into editorial.vote_summaries (vote_id, version, text, status, author)
      select ${id}, coalesce(max(version), 0) + 1, ${text}, 'rascunho', ${editor.email}
      from editorial.vote_summaries where vote_id = ${id}
      returning version`;
    await sql`
      insert into editorial.log (editor, action, vote_id, version)
      values (${editor.email}, 'rascunho', ${id}, ${row!.version})`;
  });
  revalidatePath(`/painel/votacoes/${id}`);
  redirect(`/painel/votacoes/${id}?ok=rascunho`);
}

export async function draftWithAi(form: FormData): Promise<void> {
  const editor = await requireEditor();
  const id = voteId(form);
  const vote = await voteForEditing(id);
  if (!vote) redirect("/painel");
  const result = await draftSummary(vote);
  if (!result.ok) redirect(`/painel/votacoes/${id}?erro=ia-${result.reason}`);
  await editorDb().begin(async (sql) => {
    const [row] = await sql<{ version: number }[]>`
      insert into editorial.vote_summaries (vote_id, version, text, status, author, ai_model)
      select ${id}, coalesce(max(version), 0) + 1, ${result.text}, 'rascunho', ${editor.email},
             ${result.model}
      from editorial.vote_summaries where vote_id = ${id}
      returning version`;
    await sql`
      insert into editorial.log (editor, action, vote_id, version, detail)
      values (${editor.email}, 'rascunho', ${id}, ${row!.version},
              ${`rascunho por IA (${result.model})`})`;
  });
  redirect(`/painel/votacoes/${id}?ok=ia`);
}

export async function approve(form: FormData): Promise<void> {
  const editor = await requireEditor();
  const id = voteId(form);
  const version = Number(form.get("version"));
  await editorDb().begin(async (sql) => {
    await sql`
      update editorial.vote_summaries set status = 'substituido'
      where vote_id = ${id} and status = 'publicado'`;
    const updated = await sql`
      update editorial.vote_summaries
      set status = 'publicado', approved_by = ${editor.email}, approved_at = now()
      where vote_id = ${id} and version = ${version} and status = 'rascunho'`;
    if (updated.count !== 1) throw new Error("version is not a draft");
    await sql`
      insert into editorial.log (editor, action, vote_id, version)
      values (${editor.email}, 'aprovacao', ${id}, ${version})`;
  });
  revalidatePath("/painel");
  // Profiles show the published summary right away.
  updateTag("summaries");
  redirect(`/painel/votacoes/${id}?ok=publicado`);
}

export async function curate(form: FormData): Promise<void> {
  const editor = await requireEditor();
  const id = voteId(form);
  const justification = String(form.get("justification") ?? "").trim();
  if (justification.length < MIN_JUSTIFICATION) {
    redirect(`/painel/votacoes/${id}?erro=justificativa`);
  }
  await editorDb().begin(async (sql) => {
    await sql`
      insert into core.vote_curation (vote_id, justification, curated_by, curated_at)
      values (${id}, ${justification}, ${editor.email}, now())`;
    await sql`
      insert into editorial.log (editor, action, vote_id, detail)
      values (${editor.email}, 'curadoria', ${id}, ${justification})`;
  });
  redirect(`/painel/votacoes/${id}?ok=curadoria`);
}

export async function uncurate(form: FormData): Promise<void> {
  const editor = await requireEditor();
  const id = voteId(form);
  await editorDb().begin(async (sql) => {
    await sql`delete from core.vote_curation where vote_id = ${id}`;
    await sql`
      insert into editorial.log (editor, action, vote_id)
      values (${editor.email}, 'retirada_curadoria', ${id})`;
  });
  redirect(`/painel/votacoes/${id}?ok=retirada`);
}

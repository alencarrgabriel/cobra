import "server-only";

import { redirect } from "next/navigation";

import { editorDb } from "./db";
import { authClient } from "./supabase";

export type Editor = { email: string; name: string };

export type Access =
  | { ok: true; editor: Editor }
  | {
      ok: false;
      to:
        | "/painel/entrar"
        | "/painel/codigo"
        | "/painel/indisponivel"
        | "/painel/sem-acesso";
    };

/** Who may use the panel: a signed-in user with a verified second factor (aal2) who is an
 *  active editor (design D1). Checked again by every page and action, not only the Proxy. */
export async function access(): Promise<Access> {
  const supabase = await authClient();
  if (!supabase) return { ok: false, to: "/painel/indisponivel" };
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return { ok: false, to: "/painel/entrar" };
  const { data: level } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel !== "aal2")
    return { ok: false, to: "/painel/codigo" };
  const [row] = await editorDb()<{ name: string }[]>`
    select name from editorial.editors where email = ${email} and active`;
  if (!row) return { ok: false, to: "/painel/sem-acesso" };
  return { ok: true, editor: { email, name: row.name } };
}

/** The editor, or a redirect to the step that is missing. */
export async function requireEditor(): Promise<Editor> {
  const result = await access();
  if (!result.ok) redirect(result.to);
  return result.editor;
}

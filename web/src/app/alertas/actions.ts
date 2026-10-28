"use server";

import { redirect } from "next/navigation";

import { alertsAvailable } from "@/lib/alerts/db";
import {
  cancelByLink,
  confirm,
  erase,
  isEmail,
  isUfCode,
  politicianExists,
  requestManageLink,
  requestSignup,
  setUf,
  unfollow,
  unsubscribe,
} from "@/lib/alerts/service";

// Server actions of the alerts sign-up (change alertas-cadastro, design D3). Answers never
// reveal whether an address is subscribed or over a limit.

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

function available() {
  if (!alertsAvailable()) redirect("/alertas");
}

export async function signUp(form: FormData): Promise<void> {
  available();
  const follow = /^\d{1,12}$/.test(text(form, "seguir"))
    ? Number(text(form, "seguir"))
    : null;
  const back = (erro: string) =>
    redirect(`/alertas?${follow ? `seguir=${follow}&` : ""}erro=${erro}`);
  const email = text(form, "email");
  const uf = isUfCode(text(form, "uf")) ? text(form, "uf") : null;
  const followsConsent = form.get("consentimento_seguidos") === "sim";
  if (!isEmail(email)) back("email");
  if (form.get("consentimento_email") !== "sim") back("consentimento");
  if (follow && !followsConsent) back("consentimento_seguidos");
  // A bot filled the hidden field: same answer, nothing sent.
  if (!text(form, "site")) {
    const valid = follow ? await politicianExists(follow) : true;
    if (valid) {
      await requestSignup({
        email,
        uf,
        follow: followsConsent ? follow : null,
        followsConsent,
      });
    }
  }
  redirect("/alertas/enviado");
}

export async function confirmSignup(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  redirect(
    (await confirm(token))
      ? "/alertas/confirmado"
      : `/alertas/confirmar/${encodeURIComponent(token)}`,
  );
}

export async function askManageLink(form: FormData): Promise<void> {
  available();
  const email = text(form, "email");
  if (!isEmail(email)) redirect("/alertas/meus-dados?erro=email");
  if (!text(form, "site")) await requestManageLink(email);
  redirect("/alertas/enviado?para=meus-dados");
}

function manage(token: string, ok: boolean, done: string) {
  redirect(
    ok
      ? `/alertas/meus-dados/${encodeURIComponent(token)}?feito=${done}`
      : `/alertas/meus-dados/${encodeURIComponent(token)}`,
  );
}

export async function changeUf(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  const uf = isUfCode(text(form, "uf")) ? text(form, "uf") : null;
  manage(token, await setUf(token, uf), "lugar");
}

export async function stopFollowing(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  const id = Number(text(form, "politico"));
  manage(
    token,
    Number.isSafeInteger(id) && (await unfollow(token, id)),
    "seguidos",
  );
}

export async function cancelSummary(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  manage(token, await cancelByLink(token), "cancelado");
}

export async function eraseAll(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  if (form.get("confirmo") !== "sim") manage(token, true, "confirme");
  if (await erase(token)) redirect("/alertas/apagado");
  manage(token, false, "");
}

export async function leave(form: FormData): Promise<void> {
  available();
  const token = text(form, "token");
  redirect(
    (await unsubscribe(token))
      ? `/alertas/sair/${encodeURIComponent(token)}?feito=1`
      : `/alertas/sair/${encodeURIComponent(token)}`,
  );
}

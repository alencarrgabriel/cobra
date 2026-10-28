import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { myData, UF_OPTIONS } from "@/lib/alerts/service";
import { profilePath } from "@/lib/politicians/who";
import { formatDate } from "@/lib/works/format";

import {
  cancelSummary,
  changeUf,
  eraseAll,
  stopFollowing,
} from "../../actions";
import styles from "../../alertas.module.css";
import { Expired } from "../../Expired";

export const metadata: Metadata = {
  title: "Meus dados",
  robots: { index: false },
};

const DONE: Record<string, string> = {
  lugar: "Estado atualizado.",
  seguidos: "Pronto, você deixou de seguir.",
  cancelado:
    "Resumo semanal cancelado. Seus dados continuam guardados até você apagá-los.",
  confirme: "Para apagar, marque a caixa de confirmação.",
};

const STATUS = {
  pendente: "aguardando confirmação",
  ativa: "recebendo o resumo semanal",
  cancelada: "resumo cancelado",
};

export default function MyDataPage({
  params,
  searchParams,
}: PageProps<"/alertas/meus-dados/[token]">) {
  return (
    <>
      <h1 className={styles.title}>Meus dados</h1>
      <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
        <MyData params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MyData({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const { feito } = await searchParams;
  const data = await myData(token);
  if (!data) return <Expired again="/alertas/meus-dados" />;
  const done = typeof feito === "string" ? DONE[feito] : undefined;
  return (
    <>
      {done ? (
        <p
          role="status"
          className={feito === "confirme" ? styles.alert : styles.ok}
          data-testid="feito"
        >
          {done}
        </p>
      ) : null}
      <section aria-labelledby="guardado" className={styles.prose}>
        <h2 id="guardado" className={styles.h2}>
          O que guardamos
        </h2>
        <dl className={styles.data} data-testid="meus-dados">
          <dt>E-mail</dt>
          <dd>{data.email}</dd>
          <dt>Situação</dt>
          <dd>{STATUS[data.status]}</dd>
          <dt>Estado</dt>
          <dd>{data.ufName ?? "não informado"}</dd>
          <dt>Cadastro</dt>
          <dd>{formatDate(data.createdAt)}</dd>
          <dt>Autorização do e-mail</dt>
          <dd>
            {data.emailConsent
              ? `${formatDate(data.emailConsent.at)} (termo de ${data.emailConsent.version})`
              : "não dada"}
          </dd>
          <dt>Autorização dos seguidos</dt>
          <dd>
            {data.followsConsent
              ? `${formatDate(data.followsConsent.at)} (termo de ${data.followsConsent.version})`
              : "não dada"}
          </dd>
        </dl>
        <p>
          <a
            href={`/alertas/meus-dados/${encodeURIComponent(token)}/exportar`}
            download
          >
            Baixar meus dados (JSON)
          </a>
        </p>
      </section>

      <section aria-labelledby="envios" className={styles.prose}>
        <h2 id="envios" className={styles.h2}>
          Resumos enviados
        </h2>
        {data.deliveries.length ? (
          <ul className={styles.list} data-testid="envios">
            {data.deliveries.map((d) => (
              <li key={d.weekStart}>
                Semana de {formatDate(d.weekStart)}:{" "}
                {d.status === "enviado"
                  ? `enviado em ${formatDate(d.sentAt)}`
                  : "o envio falhou e será tentado de novo"}
                , {d.voteIds.length}{" "}
                {d.voteIds.length === 1 ? "votação" : "votações"}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum ainda.</p>
        )}
      </section>

      <section aria-labelledby="seguidos" className={styles.prose}>
        <h2 id="seguidos" className={styles.h2}>
          Políticos que você segue
        </h2>
        {data.follows.length ? (
          <ul className={styles.list} data-testid="seguidos">
            {data.follows.map((p) => (
              <li key={p.id}>
                <Link href={profilePath(p.id, p.name)}>{p.name}</Link>
                <form action={stopFollowing}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="politico" value={p.id} />
                  <Button type="submit">Deixar de seguir {p.name}</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum. Para seguir, use o botão “Seguir” no perfil.</p>
        )}
      </section>

      <section aria-labelledby="estado" className={styles.prose}>
        <h2 id="estado" className={styles.h2}>
          Corrigir o estado
        </h2>
        <form action={changeUf} className={styles.form}>
          <input type="hidden" name="token" value={token} />
          <label>
            Estado
            <select name="uf" defaultValue={data.uf ?? ""}>
              <option value="">Prefiro não informar</option>
              {UF_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <Button type="submit">Salvar estado</Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="sair" className={styles.prose}>
        <h2 id="sair" className={styles.h2}>
          Cancelar ou apagar
        </h2>
        {data.status !== "cancelada" ? (
          <form action={cancelSummary}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit">Cancelar o resumo semanal</Button>
          </form>
        ) : null}
        <form action={eraseAll} className={styles.form}>
          <input type="hidden" name="token" value={token} />
          <label className={styles.check}>
            <input type="checkbox" name="confirmo" value="sim" />
            <span>
              Quero apagar meu e-mail, meu estado e os políticos que sigo. Isso
              não pode ser desfeito.
            </span>
          </label>
          <div className={styles.actions}>
            <Button type="submit">Apagar todos os meus dados</Button>
          </div>
        </form>
      </section>
    </>
  );
}

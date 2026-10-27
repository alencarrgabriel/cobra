import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { voteForEditing } from "@/lib/editorial/queries";
import { requireEditor } from "@/lib/editorial/session";
import { relevanceText } from "@/lib/politicians/relevance";
import { formatDate, formatInteger } from "@/lib/works/format";

import { approve, curate, saveDraft, uncurate } from "../../actions";
import styles from "../../painel.module.css";

const MESSAGES: Record<string, [string, boolean]> = {
  rascunho: ["Rascunho salvo. Ele não aparece no site até ser aprovado.", true],
  publicado: ["Resumo aprovado e publicado.", true],
  curadoria: ["Votação incluída no feed pela curadoria.", true],
  retirada: ["Curadoria retirada.", true],
  tamanho: ["O resumo precisa ter entre 40 e 4.000 caracteres.", false],
  justificativa: ["A justificativa precisa ter ao menos 20 caracteres.", false],
};

export default function EditVotePage({
  params,
  searchParams,
}: PageProps<"/painel/votacoes/[id]">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Edit params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Edit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEditor();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const vote = await voteForEditing(id);
  if (!vote) notFound();
  const query = await searchParams;
  const key = typeof query.ok === "string" ? query.ok : query.erro;
  const message = typeof key === "string" ? MESSAGES[key] : undefined;
  const draft = vote.versions.find((v) => v.status === "rascunho");
  const published = vote.versions.find((v) => v.status === "publicado");
  return (
    <>
      <p>
        <Link href="/painel">← Fila</Link>
      </p>
      <h1 className={styles.title}>{vote.label ?? "Votação"}</h1>
      {message ? (
        <p
          role={message[1] ? "status" : "alert"}
          className={message[1] ? styles.ok : styles.alert}
          data-testid="mensagem-painel"
        >
          {message[0]}
        </p>
      ) : null}

      <Card>
        <p>
          {formatDate(vote.occurredOn)} ·{" "}
          {vote.house === "camara" ? "Câmara dos Deputados" : "Senado Federal"}
        </p>
        <p>{vote.description}</p>
        {vote.summary ? (
          <p className={styles.note}>Ementa: {vote.summary}</p>
        ) : null}
        <p>
          Resultado:{" "}
          {vote.approved === true
            ? "aprovado"
            : vote.approved === false
              ? "rejeitado"
              : "—"}
          . Sim {formatInteger(vote.yes)}, Não {formatInteger(vote.no)}, outros{" "}
          {formatInteger(vote.other)}.
        </p>
        {vote.orientations.length ? (
          <p className={styles.note}>
            Orientações:{" "}
            {vote.orientations
              .map((o) => `${o.bench}: ${o.orientation}`)
              .join("; ")}
            .
          </p>
        ) : null}
        <p className={styles.note}>
          {relevanceText(vote.criteria, null) ?? "Sem critério de relevância."}
        </p>
        <p className={styles.note}>
          {vote.propositionUrl ? (
            <a href={vote.propositionUrl} rel="noopener noreferrer">
              Proposição no site oficial
            </a>
          ) : null}
        </p>
      </Card>

      <Card aria-labelledby="resumo">
        <h2 id="resumo" className={styles.h2}>
          Resumo
        </h2>
        <p className={styles.note}>
          Regras (DDR §9.1): fato, fonte e data; sem adjetivos de valor; o que
          muda de fato; os argumentos a favor e contra atribuídos a quem os
          defende; o mesmo tratamento para qualquer partido.
        </p>
        <form action={saveDraft} className={`${styles.form} ${styles.wide}`}>
          <input type="hidden" name="vote" value={vote.id} />
          <label>
            Texto
            <textarea
              name="text"
              defaultValue={draft?.text ?? published?.text ?? ""}
              minLength={40}
              maxLength={4000}
              required
            />
          </label>
          <div className={styles.actions}>
            <Button type="submit">Salvar rascunho</Button>
          </div>
        </form>
        {draft ? (
          <form action={approve} className={styles.actions}>
            <input type="hidden" name="vote" value={vote.id} />
            <input type="hidden" name="version" value={draft.version} />
            <Button type="submit" variant="primary">
              Aprovar e publicar a versão {draft.version}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card aria-labelledby="curadoria">
        <h2 id="curadoria" className={styles.h2}>
          Curadoria
        </h2>
        {vote.curation ? (
          <>
            <p>
              Incluída no feed por {vote.curation.by} em{" "}
              {formatDate(vote.curation.at)}: “{vote.curation.justification}”
            </p>
            <form action={uncurate}>
              <input type="hidden" name="vote" value={vote.id} />
              <Button type="submit">Retirar a curadoria</Button>
            </form>
          </>
        ) : (
          <form action={curate} className={`${styles.form} ${styles.wide}`}>
            <input type="hidden" name="vote" value={vote.id} />
            <label>
              Justificativa pública para incluir no feed
              <input
                name="justification"
                minLength={20}
                maxLength={500}
                required
              />
            </label>
            <div className={styles.actions}>
              <Button type="submit">Incluir no feed</Button>
            </div>
          </form>
        )}
      </Card>

      <Card aria-labelledby="historico">
        <h2 id="historico" className={styles.h2}>
          Histórico
        </h2>
        {vote.versions.length ? (
          <ol className={styles.list} data-testid="historico">
            {vote.versions.map((v) => (
              <li key={v.version} className={styles.version}>
                <p className={styles.note}>
                  Versão {v.version} · {v.status} · escrita por {v.author} em{" "}
                  {formatDate(v.createdAt)}
                  {v.approvedBy && v.approvedAt
                    ? ` · aprovada por ${v.approvedBy} em ${formatDate(v.approvedAt)}`
                    : ""}
                  {v.aiModel ? ` · rascunho de IA (${v.aiModel})` : ""}
                </p>
                <p>{v.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>Ainda não há resumo.</p>
        )}
      </Card>
    </>
  );
}

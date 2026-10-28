import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { requireEditor } from "@/lib/editorial/session";
import { deadlineText } from "@/lib/reports/deadline";
import { panelReport } from "@/lib/reports/queries";
import { KIND_LABEL, STATUS_LABEL, todayInBrasilia } from "@/lib/reports/rules";
import { formatDate } from "@/lib/works/format";

import { triageReport } from "../../actions";
import styles from "../../painel.module.css";

export const metadata: Metadata = { title: "Reporte" };

const ERRORS: Record<string, string> = {
  situacao: "Escolha a situação.",
  nota: "A nota pública precisa de 20 a 2.000 caracteres e é obrigatória para fechar.",
};

export default function ReportPage({
  params,
  searchParams,
}: PageProps<"/painel/reportes/[id]">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Report params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Report({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEditor();
  const id = Number((await params).id);
  const { erro, ok } = await searchParams;
  const r = Number.isSafeInteger(id) && id > 0 ? await panelReport(id) : null;
  if (!r) {
    return (
      <p>
        Reporte não encontrado. <Link href="/painel/reportes">Voltar</Link>
      </p>
    );
  }
  const due = deadlineText(r, todayInBrasilia());
  return (
    <>
      <p>
        <Link href="/painel/reportes">← Reportes</Link>
      </p>
      <h1 className={styles.title}>Reporte nº {r.id}</h1>
      {ok ? (
        <p role="status" className={styles.ok} data-testid="reporte-salvo">
          Salvo.
        </p>
      ) : null}
      {typeof erro === "string" && ERRORS[erro] ? (
        <p role="alert" className={styles.alert} data-testid="erro-reporte">
          {ERRORS[erro]}
        </p>
      ) : null}
      <p>
        {KIND_LABEL[r.kind]} sobre <Link href={r.pagePath}>{r.pagePath}</Link>,
        recebido em {formatDate(r.createdAt)}. {STATUS_LABEL[r.status]}
        {due ? ` (${due})` : ""}.
      </p>
      <h2 className={styles.h2}>O que a pessoa escreveu</h2>
      <p className={styles.secret} data-testid="descricao">
        {r.description}
      </p>
      <p className={styles.note}>
        {r.hasEmail
          ? "A pessoa deixou e-mail para resposta."
          : r.emailPurged
            ? "O e-mail já foi apagado (90 dias depois do fechamento)."
            : "A pessoa não deixou e-mail: ela acompanha pela fila pública."}{" "}
        Não publique na nota nada que identifique quem reportou.
      </p>

      <form action={triageReport} className={`${styles.form} ${styles.wide}`}>
        <input type="hidden" name="report" value={r.id} />
        <label>
          Situação
          <select name="status" defaultValue={r.status}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nota pública (o que mudou e quando, ou por que o dado foi mantido)
          <textarea name="note" defaultValue={r.publicNote ?? ""} />
        </label>
        {r.hasEmail ? (
          <label>
            Resposta por e-mail (opcional; vai com a situação e a nota)
            <textarea name="reply" />
          </label>
        ) : null}
        <div className={styles.actions}>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </div>
      </form>

      <h2 className={styles.h2}>Histórico</h2>
      <ul className={styles.list} data-testid="historico-reporte">
        {r.history.map((h, i) => (
          <li key={i}>
            {formatDate(h.at)} · {h.editor} · {STATUS_LABEL[h.status]}
            {h.replied ? " · respondido por e-mail" : ""}
          </li>
        ))}
      </ul>
      {r.history.length === 0 ? <p>Nenhuma mudança ainda.</p> : null}
    </>
  );
}

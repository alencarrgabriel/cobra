import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { queue } from "@/lib/editorial/queries";
import { requireEditor } from "@/lib/editorial/session";
import { relevanceText } from "@/lib/politicians/relevance";
import { formatDate } from "@/lib/works/format";

import { signOut } from "./actions";
import styles from "./painel.module.css";

const HOUSE: Record<string, string> = { camara: "Câmara", senado: "Senado" };

export default function QueuePage() {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando a fila…</p>}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  const editor = await requireEditor();
  const items = await queue();
  return (
    <>
      <header className={styles.actions}>
        <h1 className={styles.title}>Fila de resumos</h1>
        <form action={signOut}>
          <Button type="submit">Sair ({editor.name})</Button>
        </form>
      </header>
      <p className={styles.note}>
        Votações relevantes das duas casas sem resumo publicado, da mais recente
        para a mais antiga.
      </p>
      <ul className={styles.list} data-testid="fila">
        {items.map((v) => (
          <li key={v.id}>
            <Card>
              <p>
                <strong>{formatDate(v.occurredOn)}</strong> · {HOUSE[v.house]} ·{" "}
                {v.label ?? "Votação"}
                {v.hasDraft ? " · tem rascunho" : ""}
              </p>
              <p className={styles.note}>
                {v.description} {relevanceText(v.criteria, v.type)}.
              </p>
              <p>
                <Link href={`/painel/votacoes/${v.id}`}>Escrever o resumo</Link>
              </p>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p>Nenhuma votação na fila.</p> : null}
    </>
  );
}

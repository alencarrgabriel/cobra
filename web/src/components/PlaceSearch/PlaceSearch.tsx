import { Button } from "@/components/Button/Button";

import styles from "./PlaceSearch.module.css";

/**
 * "CEP, cidade ou UF" search (RF-01). Sent by POST so the CEP never goes into an address
 * (change busca-geografica, design D3). Works without JavaScript.
 */
export function PlaceSearch({ id = "lugar" }: { id?: string }) {
  return (
    <>
      <form
        method="post"
        action="/buscar"
        className={styles.search}
        aria-describedby={`${id}-ajuda`}
      >
        <label htmlFor={id} className="sr-only">
          CEP, cidade ou UF
        </label>
        <input
          id={id}
          name="q"
          autoComplete="off"
          placeholder="CEP, cidade ou UF"
          required
          minLength={2}
          maxLength={120}
        />
        <Button variant="primary" type="submit">
          Ver meus representantes
        </Button>
      </form>
      <p id={`${id}-ajuda`} className={styles.hint}>
        Sem cadastro. Seu CEP vira só o nome do lugar e é descartado: não fica
        guardado nem aparece no endereço da página.
      </p>
    </>
  );
}

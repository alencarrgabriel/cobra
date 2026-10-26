import { Card } from "@/components/Card/Card";

/** Recognised by name, so this module does not depend on the server-only database client. */
export function isDataUnavailable(error: unknown): boolean {
  return error instanceof Error && error.name === "DataUnavailableError";
}

export function DataUnavailable() {
  return (
    <Card role="status" data-testid="dados-indisponiveis">
      <h2>Dados indisponíveis no momento</h2>
      <p>
        Não conseguimos ler os dados das obras agora. Tente de novo em alguns
        minutos. O resto do site continua funcionando.
      </p>
    </Card>
  );
}

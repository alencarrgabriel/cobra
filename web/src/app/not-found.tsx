import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container">
      <h1>Página não encontrada</h1>
      <p>
        Não encontramos nada neste endereço. Ele pode ter sido digitado errado
        ou mudado.
      </p>
      <p>
        <Link href="/">Voltar para a página inicial</Link>
      </p>
    </main>
  );
}

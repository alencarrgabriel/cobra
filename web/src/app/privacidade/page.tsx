import type { Metadata } from "next";
import Link from "next/link";

import {
  CONSENT_VERSION,
  EMAIL_CONSENT,
  FOLLOWS_CONSENT,
} from "@/lib/alerts/consent";

import styles from "../alertas/alertas.module.css";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "O que o Cobra guarda sobre você, para quê e como ver, baixar ou apagar seus dados.",
};

// Plain-language privacy notice (DDR §10.2, change alertas-cadastro design D5).
export default function PrivacyPage() {
  return (
    <main className={`${styles.page} gutter`}>
      <h1 className={styles.title}>Privacidade</h1>
      <div className={styles.prose}>
        <p className={styles.lead}>
          Você usa o Cobra sem cadastro. Só guardamos dados seus se você pedir
          os alertas por e-mail.
        </p>

        <h2 className={styles.h2}>O que guardamos</h2>
        <ul>
          <li>Seu e-mail, para mandar o resumo semanal.</li>
          <li>
            O estado, se você informar, para saber quem são seus representantes.
          </li>
          <li>
            Os políticos que você segue, se você autorizar à parte. Essa lista
            pode indicar sua opinião política, que a LGPD trata como dado
            sensível.
          </li>
          <li>
            A data e a versão de cada autorização, e um registro das ações sobre
            o cadastro (confirmação, acesso, exportação, exclusão), sem o seu
            e-mail.
          </li>
        </ul>
        <p>
          O lugar que você pesquisa no site fica só no seu aparelho. O CEP nunca
          é guardado.
        </p>

        <h2 className={styles.h2}>Por que e com que base</h2>
        <p>
          Só para enviar o resumo que você pediu. A base legal é o seu
          consentimento (LGPD, art. 7º, I) e, para os políticos seguidos, o
          consentimento específico e destacado (art. 11, I). Os termos atuais,
          versão de {CONSENT_VERSION}:
        </p>
        <ul>
          <li>“{EMAIL_CONSENT}”</li>
          <li>“{FOLLOWS_CONSENT}”</li>
        </ul>

        <h2 className={styles.h2}>Como protegemos</h2>
        <p>
          E-mail, estado e seguidos ficam cifrados no banco (AES-256). O site
          público não tem acesso a eles, e cada acesso fica registrado.
        </p>

        <h2 className={styles.h2}>Seus direitos</h2>
        <p>
          Em <Link href="/alertas/meus-dados">Meus dados</Link> você recebe um
          link para ver tudo o que guardamos, baixar em JSON, corrigir o estado,
          deixar de seguir, cancelar o resumo e apagar tudo. Toda mensagem tem
          um link para sair com um clique.
        </p>

        <h2 className={styles.h2}>O que nunca fazemos</h2>
        <p>
          Vender, compartilhar ou usar seus dados para campanha, perfilamento
          político ou publicidade.
        </p>

        <h2 className={styles.h2}>Quem envia</h2>
        <p>
          As mensagens saem pelo Resend, um serviço de envio de e-mails, que
          recebe só o endereço e o texto de cada mensagem. O encarregado pelo
          tratamento de dados (DPO) será nomeado antes do lançamento público.
        </p>
      </div>
    </main>
  );
}

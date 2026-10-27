"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button/Button";
import { SidePanel } from "@/components/SidePanel/SidePanel";
import { Toast } from "@/components/Toast/Toast";
import { CARD_SIZES, type CardFormat } from "@/lib/cards/formats";
import { cardPath, whatsappUrl, xUrl } from "@/lib/cards/share";

import styles from "./SharePanel.module.css";

// "Compartilhar" panel (RF-67, change compartilhamento, design D6). The shared address is the
// page's canonical path only: nothing about the person who shares it.

type Props = {
  /** Canonical path of the page, e.g. "/obras/900002.53-02". */
  path: string;
  /** Factual text that goes with the link. */
  text: string;
  card: { kind: Parameters<typeof cardPath>[0]; id: string | number };
};

const FORMAT_LABEL: Record<CardFormat, string> = {
  feed: "Feed (4:5)",
  stories: "Stories (9:16)",
  link: "Link (1,91:1)",
};

const ORDER: CardFormat[] = ["feed", "stories", "link"];

export function SharePanel({ path, text, card }: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<CardFormat>("feed");
  const [toast, setToast] = useState<string | null>(null);
  const done = useCallback(() => setToast(null), []);
  return (
    <>
      <div className={styles.trigger}>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          icon={<ShareIcon />}
        >
          Compartilhar
        </Button>
      </div>
      <SidePanel
        open={open}
        title="Compartilhar"
        onClose={() => setOpen(false)}
      >
        {open ? (
          <Body
            path={path}
            text={text}
            card={card}
            format={format}
            onFormat={setFormat}
            onToast={setToast}
          />
        ) : null}
      </SidePanel>
      <Toast message={toast} onDone={done} />
    </>
  );
}

function Body({
  path,
  text,
  card,
  format,
  onFormat,
  onToast,
}: Props & {
  format: CardFormat;
  onFormat: (f: CardFormat) => void;
  onToast: (m: string) => void;
}) {
  // Rendered only while open, so `window` is always there.
  const url = new URL(path, window.location.origin).href;
  const src = cardPath(card.kind, card.id, format);
  const fileName = `cobra-${card.kind}-${card.id}-${format}.png`;
  const { width, height } = CARD_SIZES[format];
  const canShare = typeof navigator.share === "function";
  const canCopyImage =
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  // The image is fetched ahead, so the native share still runs within the tap.
  const file = useRef<File | null>(null);
  useEffect(() => {
    file.current = null;
    if (!canShare) return;
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (live && blob)
          file.current = new File([blob], fileName, { type: "image/png" });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, fileName, canShare]);

  async function share() {
    const withFile =
      file.current && navigator.canShare?.({ files: [file.current] })
        ? { files: [file.current] }
        : {};
    try {
      await navigator.share({ title: text, text, url, ...withFile });
    } catch {
      // Cancelled by the person: nothing to say.
    }
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": fetch(src).then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.blob();
          }),
        }),
      ]);
      onToast("Imagem copiada");
    } catch {
      onToast("Não foi possível copiar a imagem");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      onToast("Link copiado");
    } catch {
      onToast("Não foi possível copiar o link");
    }
  }

  return (
    <div className={styles.body} data-testid="painel-compartilhar">
      <div className={styles.formats} role="group" aria-label="Formato do card">
        {ORDER.map((f) => (
          <button
            key={f}
            type="button"
            className={styles.format}
            aria-pressed={f === format}
            onClick={() => onFormat(f)}
          >
            {FORMAT_LABEL[f]}
          </button>
        ))}
      </div>
      <div className={styles.preview}>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, already sized */}
        <img
          src={src}
          alt={`Prévia do card: ${text}`}
          width={width}
          height={height}
          className={styles.image}
        />
      </div>
      <ul className={styles.actions}>
        <li>
          <Button
            variant="whatsapp"
            href={whatsappUrl(text, url)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.main}
          >
            Enviar no WhatsApp
          </Button>
        </li>
        {canShare ? (
          <li>
            <Button type="button" onClick={share}>
              Compartilhar…
            </Button>
          </li>
        ) : null}
        <li>
          <Button href={src} download={fileName}>
            Baixar imagem
          </Button>
        </li>
        {canCopyImage ? (
          <li>
            <Button type="button" onClick={copyImage}>
              Copiar imagem
            </Button>
          </li>
        ) : null}
        <li>
          <Button
            href={xUrl(text, url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Postar no X
          </Button>
        </li>
        <li>
          <Button type="button" onClick={copyLink}>
            Copiar link
          </Button>
        </li>
      </ul>
      <p className={styles.note}>
        O link leva a esta mesma página. Nada sobre você vai no link ou no card.
      </p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

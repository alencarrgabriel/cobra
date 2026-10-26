"use client";

import { type ReactNode, useEffect, useRef } from "react";

import styles from "./SidePanel.module.css";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Optional element shown above the title (e.g. "‹ Voltar para Bahia"). */
  back?: ReactNode;
  children: ReactNode;
};

const WIDE = "(min-width: 1080px)";

/**
 * Details opened from a list: a side panel on wide screens (non-modal <dialog>) and a
 * bottom sheet on phones (modal <dialog>). Esc closes it and focus returns to the opener.
 */
export function SidePanel({ open, title, onClose, back, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      if (window.matchMedia(WIDE).matches) dialog.show();
      else dialog.showModal();
      closeBtn.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Return focus to whatever opened the panel, however it was closed.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onDialogClose = () => {
      opener.current?.focus();
      opener.current = null;
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.panel}
      aria-labelledby="side-panel-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        // A non-modal dialog does not fire `cancel` on Esc, so handle it here too.
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className={styles.handle} aria-hidden="true" />
      <div className={styles.head}>
        <div className={styles.titles}>
          {back}
          <h2 id="side-panel-title" className={styles.title}>
            {title}
          </h2>
        </div>
        <button
          ref={closeBtn}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}

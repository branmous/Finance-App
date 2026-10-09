"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "./icon";

type DialogProps = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/** Modal built on the native <dialog>: focus trap, Esc to close and backdrop come for free. */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-panel border border-paper-line bg-paper-raised p-0 text-ink shadow-xl backdrop:bg-ink/50"
    >
      {open ? (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="-mr-2 -mt-1 rounded-field p-2 text-paper-muted hover:bg-leaf-tint hover:text-ink"
            >
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

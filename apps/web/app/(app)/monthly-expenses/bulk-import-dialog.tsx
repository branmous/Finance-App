"use client";

import { formatCop, isValidPeriod } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useFormatters } from "@/lib/format";
import { useValidationMessage } from "@/lib/use-validation-message";

import { importBulkExpenses, previewBulkExpenses, type BulkPreviewResult } from "./actions";

/** Errors shown at once; a file full of mistakes would otherwise bury the dialog. */
const MAX_ERRORS_SHOWN = 50;

type Props = {
  open: boolean;
  /** Month the page is showing; the initial month to load. */
  defaultPeriod: string;
  onClose: () => void;
};

export function BulkImportDialog({ open, defaultPeriod, onClose }: Props) {
  const t = useTranslations("expenses.bulk");
  return (
    <Dialog open={open} title={t("title")} onClose={onClose}>
      <BulkImportForm defaultPeriod={defaultPeriod} onClose={onClose} />
    </Dialog>
  );
}

function BulkImportForm({ defaultPeriod, onClose }: Omit<Props, "open">) {
  const t = useTranslations("expenses.bulk");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const format = useFormatters();
  const [period, setPeriod] = useState(defaultPeriod);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ count: number; period: string } | null>(null);
  const [checking, startChecking] = useTransition();
  const [saving, startSaving] = useTransition();
  // Only the latest check may update the screen, if the user changes the file or month meanwhile.
  const latestCheck = useRef(0);

  function buildForm(nextFile: File, nextPeriod: string) {
    const form = new FormData();
    form.set("file", nextFile);
    form.set("period", nextPeriod);
    return form;
  }

  function check(nextFile: File | null, nextPeriod: string) {
    const id = ++latestCheck.current;
    setPreview(null);
    setError(null);
    if (!nextFile || !isValidPeriod(nextPeriod)) return;
    startChecking(async () => {
      const result = await previewBulkExpenses(buildForm(nextFile, nextPeriod));
      if (id === latestCheck.current) setPreview(result);
    });
  }

  function confirm() {
    if (!file || !preview?.ok) return;
    setError(null);
    startSaving(async () => {
      const result = await importBulkExpenses(buildForm(file, period));
      if (result.ok) {
        setCreated({ count: result.created, period });
      } else if (result.errors) {
        setPreview(result);
      } else {
        setError(message(result.message) ?? null);
      }
    });
  }

  const monthLabel = isValidPeriod(period) ? format.month(period) : "";

  if (created) {
    return (
      <div>
        <p role="status" className="rounded-field bg-leaf-tint px-3 py-2.5 text-sm font-medium">
          {t("success", { count: created.count, month: format.month(created.period) })}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {created.period !== defaultPeriod ? (
            <Link
              href={`/monthly-expenses?period=${created.period}`}
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-field bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
            >
              {t("viewMonth", { month: format.month(created.period) })}
            </Link>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {tCommon("close")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-paper-muted">{t("intro")}</p>

      <Input
        id="bulk-period"
        label={t("month")}
        type="month"
        value={period}
        onChange={(event) => {
          setPeriod(event.target.value);
          check(file, event.target.value);
        }}
        required
      />

      <a
        href="/monthly-expenses/template"
        download
        className="inline-block text-sm font-semibold text-leaf underline underline-offset-4"
      >
        {t("downloadTemplate")}
      </a>

      <Input
        id="bulk-file"
        label={t("file")}
        type="file"
        accept=".csv,text/csv"
        className="py-2"
        onChange={(event) => {
          const chosen = event.target.files?.[0] ?? null;
          setFile(chosen);
          check(chosen, period);
        }}
      />

      <div aria-live="polite">
        {checking ? <p className="text-sm text-paper-muted">{t("checking")}</p> : null}

        {!checking && preview?.ok ? (
          <div className="space-y-2 rounded-field border border-paper-line px-3 py-3 text-sm">
            <p className="font-semibold">{t("summary", { count: preview.count, total: formatCop(preview.total) })}</p>
            {preview.ignored > 0 ? <p className="text-paper-muted">{t("ignored", { count: preview.ignored })}</p> : null}
            {preview.existingInPeriod > 0 ? (
              <p className="rounded-field bg-saffron-tint px-3 py-2.5">
                {t("existing", { month: monthLabel, count: preview.existingInPeriod })}
              </p>
            ) : null}
          </div>
        ) : null}

        {!checking && preview && !preview.ok && preview.errors ? (
          <div role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
            <p className="font-semibold">{t("errorsTitle")}</p>
            <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
              {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((item, index) => (
                <li key={index}>
                  <span className="font-medium">
                    {item.line === 0
                      ? t("errorFile")
                      : item.column
                        ? t("errorWhereColumn", { line: item.line, column: t(`column.${item.column}`) })
                        : t("errorWhere", { line: item.line })}
                    :
                  </span>{" "}
                  {message(item.error)}
                </li>
              ))}
            </ul>
            {preview.errors.length > MAX_ERRORS_SHOWN ? (
              <p className="mt-2">{t("moreErrors", { count: preview.errors.length - MAX_ERRORS_SHOWN })}</p>
            ) : null}
          </div>
        ) : null}

        {!checking && preview && !preview.ok && !preview.errors ? (
          <p role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
            {message(preview.message)}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={confirm} loading={saving} disabled={!preview?.ok || checking}>
          {preview?.ok ? t("confirm", { count: preview.count }) : t("confirm", { count: 0 })}
        </Button>
      </div>
    </div>
  );
}

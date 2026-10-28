import { IconButton } from "@/components/ui/icon-button";

type Action = { label: string; onClick: () => void; loading?: boolean | undefined };

type Props = {
  /** Opens the payment page in a new tab. */
  link?: { label: string; href: string } | undefined;
  unlink?: Action | undefined;
  pay?: Action | undefined;
  /** Moves a paid item back to pending. */
  undoPay?: Action | undefined;
  edit?: Action | undefined;
  remove?: Action | undefined;
  /** On phones, drops to its own line below the row; the parent row must use `flex-wrap`. */
  stacked?: boolean;
};

/** Row actions in one fixed order (link, unlink, pay, undo, edit, delete), so a missing one never shifts the rest. */
export function RowActions({ link, unlink, pay, undoPay, edit, remove, stacked = false }: Props) {
  return (
    <div className={`flex shrink-0 items-center ${stacked ? "max-sm:order-last max-sm:w-full max-sm:justify-end" : ""}`}>
      {link ? <IconButton icon="externalLink" label={link.label} href={link.href} /> : null}
      {unlink ? <IconButton icon="unlink" label={unlink.label} onClick={unlink.onClick} loading={unlink.loading} /> : null}
      {pay ? <IconButton icon="check" tone="positive" label={pay.label} onClick={pay.onClick} loading={pay.loading} /> : null}
      {undoPay ? <IconButton icon="undo" label={undoPay.label} onClick={undoPay.onClick} loading={undoPay.loading} /> : null}
      {edit ?<IconButton icon="pencil" label={edit.label} onClick={edit.onClick} /> : null}
      {remove ? <IconButton icon="trash" tone="danger" label={remove.label} onClick={remove.onClick} /> : null}
    </div>
  );
}

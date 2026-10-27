import { IconButton } from "@/components/ui/icon-button";

type Action = { label: string; onClick: () => void; loading?: boolean | undefined };

type Props = {
  /** Opens the payment page in a new tab. */
  link?: { label: string; href: string } | undefined;
  unlink?: Action | undefined;
  pay?: Action | undefined;
  edit?: Action | undefined;
  remove?: Action | undefined;
};

/** Row actions in one fixed order (link, unlink, pay, edit, delete), so a missing one never shifts the rest. */
export function RowActions({ link, unlink, pay, edit, remove }: Props) {
  return (
    <div className="flex shrink-0 items-center">
      {link ? <IconButton icon="externalLink" label={link.label} href={link.href} /> : null}
      {unlink ? <IconButton icon="unlink" label={unlink.label} onClick={unlink.onClick} loading={unlink.loading} /> : null}
      {pay ? <IconButton icon="check" tone="positive" label={pay.label} onClick={pay.onClick} loading={pay.loading} /> : null}
      {edit ? <IconButton icon="pencil" label={edit.label} onClick={edit.onClick} /> : null}
      {remove ? <IconButton icon="trash" tone="danger" label={remove.label} onClick={remove.onClick} /> : null}
    </div>
  );
}

import { Icon, type IconName } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";

const TONES = {
  neutral: "hover:text-ink",
  positive: "hover:text-leaf",
  danger: "hover:text-clay",
} as const;

const BASE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-field text-paper-muted transition-colors hover:bg-leaf-tint disabled:cursor-not-allowed disabled:opacity-60";

type Props = {
  icon: IconName;
  /** Accessible name and tooltip; icon-only controls need both. */
  label: string;
  tone?: keyof typeof TONES;
} & (
  | { href: string; onClick?: undefined; loading?: undefined }
  | { href?: undefined; onClick: () => void; loading?: boolean | undefined }
);

/** Icon-only row action. Renders a link (new tab) when given `href`, a button otherwise. */
export function IconButton({ icon, label, tone = "neutral", href, onClick, loading = false }: Props) {
  const className = `${BASE} ${TONES[tone]}`;
  const glyph = <Icon name={icon} width={18} height={18} />;

  if (href !== undefined) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>
        {glyph}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={loading || undefined}
      disabled={loading}
      onClick={onClick}
      className={className}
    >
      {loading ? <Spinner /> : glyph}
    </button>
  );
}

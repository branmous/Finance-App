import type { ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/ui/spinner";

const VARIANTS = {
  primary: "bg-leaf text-white hover:bg-leaf-dark",
  secondary: "border border-paper-line bg-paper-raised text-ink hover:bg-leaf-tint",
  danger: "bg-clay text-white hover:brightness-95",
  ghost: "text-paper-muted hover:bg-leaf-tint hover:text-ink",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  /** Shows a spinner and blocks clicks while an action is running. */
  loading?: boolean;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-field px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

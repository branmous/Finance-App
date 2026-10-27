import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export const CONTROL =
  "mt-1.5 block min-h-11 w-full rounded-field border border-paper-line bg-paper-raised px-3 text-base text-ink placeholder:text-paper-muted/70 focus:border-leaf";

type FieldShellProps = { id: string; label: string; error?: string | undefined; children: ReactNode };

export function FieldShell({ id, label, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | undefined };

export function Input({ id, label, error, className = "", ...props }: InputProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string | undefined;
  options: readonly { value: string; label: string }[];
};

export function Select({ id, label, error, options, className = "", ...props }: SelectProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

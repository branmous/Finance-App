"use client";

import { filterCategories, findExactCategory } from "@finance-app/core/categories";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { nextActiveIndex } from "@/lib/list-navigation";

import { CONTROL, FieldShell } from "./field";
import { Icon } from "./icon";

export type ComboboxOption = { value: string; label: string; hint?: string };

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder: string;
  noResults: string;
  error?: string | undefined;
  /** When given, a last option offers to create what was typed; it receives the typed text. */
  onCreate?: (typed: string) => void;
  createLabel?: (typed: string) => string;
};

type Item = { kind: "option"; option: ComboboxOption } | { kind: "create" };

/** A searchable single-choice field: type to filter, arrows to move, Enter to pick, Esc to close. */
export function Combobox({ id, label, value, onChange, options, placeholder, noResults, error, onCreate, createLabel }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  const selected = options.find((option) => option.value === value);
  const matches = filterCategories(
    options.map((option) => ({ ...option, name: option.label })),
    query,
  );
  const canCreate = onCreate !== undefined && findExactCategory(options.map((o) => ({ name: o.label })), query) === undefined;
  const items: Item[] = [
    ...matches.map((option): Item => ({ kind: "option", option })),
    ...(canCreate ? [{ kind: "create" } as const] : []),
  ];

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }

  function choose(item: Item | undefined) {
    if (!item) return;
    if (item.kind === "create") onCreate?.(query.trim());
    else onChange(item.option.value);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Home":
      case "End":
        if (event.key === "Home" || event.key === "End") {
          // Home/End move the text cursor unless the list is being navigated.
          if (!open) return;
        }
        event.preventDefault();
        if (!open) setOpen(true);
        setActive(nextActiveIndex(active, event.key, items.length));
        return;
      case "Enter":
        if (!open) return;
        // Never submit the surrounding form from the search box.
        event.preventDefault();
        choose(items[active] ?? (matches.length === 1 ? items[0] : undefined));
        return;
      case "Escape":
        if (!open) return;
        // Closes the list only; the modal stays open.
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        close();
        return;
    }
  }

  const activeId = active >= 0 ? `${id}-option-${active}` : undefined;

  return (
    <FieldShell id={id} label={label} error={error}>
      <div
        ref={rootRef}
        className="relative"
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
        }}
      >
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          className={`${CONTROL} pr-10`}
          placeholder={selected?.label ?? placeholder}
          value={open ? query : (selected?.label ?? "")}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
            setActive(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        <Icon
          name="chevronRight"
          width={16}
          height={16}
          className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 rotate-90 text-paper-muted"
        />
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-field border border-paper-line bg-paper-raised py-1 shadow-lg"
          >
            {matches.length === 0 ? <li className="px-3 py-2 text-sm text-paper-muted">{noResults}</li> : null}
            {items.map((item, index) => {
              const isActive = index === active;
              const base = `flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 text-left text-base ${
                isActive ? "bg-leaf-tint" : "hover:bg-leaf-tint"
              }`;
              if (item.kind === "create") {
                return (
                  <li
                    key="create"
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                    // Keeps the input focused so the list does not close before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(item)}
                    className={`${base} border-t border-paper-line font-semibold text-leaf`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="plus" width={16} height={16} />
                      {createLabel?.(query.trim())}
                    </span>
                  </li>
                );
              }
              return (
                <li
                  key={item.option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={item.option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                  className={`${base} ${item.option.value === value ? "font-semibold" : ""}`}
                >
                  <span className="truncate">{item.option.label}</span>
                  {item.option.hint ? <span className="shrink-0 text-xs text-paper-muted">{item.option.hint}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}

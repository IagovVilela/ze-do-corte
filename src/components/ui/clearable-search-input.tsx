"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ClearableSearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  /** Ícone de lupa à esquerda (estilos BN por padrão). */
  withSearchIcon?: boolean;
  /** Classe do ícone Search quando `withSearchIcon` está ativo. */
  searchIconClassName?: string;
  clearLabel?: string;
  containerClassName?: string;
};

export const ClearableSearchInput = forwardRef<
  HTMLInputElement,
  ClearableSearchInputProps
>(function ClearableSearchInput(
  {
    value,
    defaultValue = "",
    onChange,
    onClear,
    withSearchIcon = false,
    searchIconClassName,
    clearLabel = "Limpar busca",
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue));
  const current = isControlled ? value : uncontrolled;
  const showClear = current.trim().length > 0;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  function handleClear() {
    if (!isControlled) setUncontrolled("");
    onChange?.("");
    onClear?.();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className={cn("relative", containerClassName)}>
      {withSearchIcon ? (
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[var(--bn-muted)]",
            searchIconClassName,
          )}
          aria-hidden
        />
      ) : null}
      <input
        ref={inputRef}
        type="search"
        value={current}
        onChange={handleChange}
        className={cn(
          withSearchIcon && "pl-10",
          showClear ? "pr-10" : undefined,
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          className,
        )}
        {...rest}
      />
      {showClear ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-1.5 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-current opacity-55 transition hover:bg-white/10 hover:opacity-100"
          aria-label={clearLabel}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
});

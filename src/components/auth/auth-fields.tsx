"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export const authInputClass =
  "min-h-12 w-full rounded-lg border border-[#2F3336] bg-[#0b0e15]/80 px-4 text-[15px] text-[#e1e2ec] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]/70 focus:ring-2 focus:ring-[#3B82F6]/20";

export function AuthLabelCaps({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold tracking-[0.1em] text-[#adc6ff] uppercase sm:text-[12px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AuthField({
  label,
  hint,
  className,
  ...props
}: {
  label: string;
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-[#c2c6d6]">{label}</span>
      <input className={cn(authInputClass, className)} {...props} />
      {hint ? <span className="block text-xs text-[#9CA3AF]">{hint}</span> : null}
    </label>
  );
}

export function AuthPasswordField({
  label,
  hint,
  autoComplete,
  ...props
}: {
  label: string;
  hint?: ReactNode;
  autoComplete?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-[#c2c6d6]">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className={cn(authInputClass, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-white/5 hover:text-[#e1e2ec]"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? (
            <EyeOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
      {hint ? <span className="block text-xs text-[#9CA3AF]">{hint}</span> : null}
    </label>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
    >
      {children}
    </p>
  );
}

export function AuthSubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#3B82F6] px-6 text-[15px] font-bold text-white shadow-[0_0_24px_-8px_rgba(59,130,246,0.45)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

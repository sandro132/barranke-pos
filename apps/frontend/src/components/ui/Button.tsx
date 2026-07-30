import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-body font-semibold text-sm px-4 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const VARIANTS: Record<string, string> = {
  primary: "bg-rock text-ink hover:bg-rock-bright active:bg-rock-dim",
  secondary: "bg-surface-raised text-ink border border-border hover:border-rock",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface",
};

/**
 * Botón base de todo el sistema. Padding generoso (py-3) a propósito:
 * esto se usa en pantallas táctiles de meseros, los objetivos de toque
 * deben ser grandes para minimizar errores en movimiento.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${BASE} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

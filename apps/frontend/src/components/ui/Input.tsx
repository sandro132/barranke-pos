import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`bg-surface border border-border rounded-md px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:border-rock transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-rock-bright">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

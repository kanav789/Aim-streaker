import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-secondary"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-2xl border bg-zinc-950 px-4 h-14 text-primary outline-none transition placeholder:text-zinc-600 focus:border-accent ${
            error ? "border-accent" : "border-zinc-800"
          } ${className}`}
          {...props}
        />
        {error ? <p className="text-sm text-accent">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = "Input";

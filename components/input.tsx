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
          className={`w-full rounded-md border bg-surface px-3 py-2 text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent ${
            error ? "border-accent" : "border-border"
          } ${className}`}
          {...props}
        />
        {error ? <p className="text-sm text-accent">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = "Input";

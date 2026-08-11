import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-background hover:bg-accent/90",
  secondary:
    "border border-border bg-surface text-primary hover:border-secondary",
  ghost: "bg-transparent text-secondary hover:text-primary",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

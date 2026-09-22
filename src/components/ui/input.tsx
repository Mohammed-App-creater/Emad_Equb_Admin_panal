import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Keys that would let a number input hold a negative or scientific value.
const BLOCKED_NUMBER_KEYS = ["-", "+", "e", "E"];

// Normalize a number input's raw string: drop any minus sign (no negatives) and
// strip leading zeros on the integer part ("010" → "10") while preserving a lone
// "0", decimals ("0.5"), and an empty string (so the field can be cleared).
function sanitizeNumberValue(raw: string): string {
  let v = raw.replace(/-/g, "");
  v = v.replace(/^0+(?=\d)/, "");
  return v;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, rightIcon, type, onChange, onKeyDown, min, ...props }, ref) => {
    const isNumber = type === "number";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumber) {
        const sanitized = sanitizeNumberValue(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isNumber && BLOCKED_NUMBER_KEYS.includes(e.key)) {
        e.preventDefault();
      }
      onKeyDown?.(e);
    };

    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3 text-muted-foreground">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          type={type}
          // Floor at 0 by default for number inputs — no negative values.
          min={isNumber ? (min ?? 0) : min}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
            // Hide the native spinner arrows on number inputs.
            isNumber &&
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            !!icon && "pl-10",
            !!rightIcon && "pr-10",
            className
          )}
          {...props}
        />

        {rightIcon && (
          <span className="absolute right-3 text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

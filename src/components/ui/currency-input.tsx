import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  currency?: string;
  className?: string;
}

const formatWithSeparators = (value: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-US").format(value);
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    { value, onChange, placeholder, disabled, currency = "ETB", className, ...props },
    ref
  ) => {
    const [display, setDisplay] = React.useState<string>(formatWithSeparators(value));

    React.useEffect(() => {
      const raw = display.replace(/[^\d]/g, "");
      const parsed = raw === "" ? null : Number(raw);
      if (parsed !== value) {
        setDisplay(formatWithSeparators(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: depending on `display` would loop
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      if (raw === "") {
        setDisplay("");
        onChange(null);
        return;
      }
      const numeric = Number(raw);
      setDisplay(formatWithSeparators(numeric));
      onChange(numeric);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        icon={
          <span className="text-xs font-medium text-muted-foreground">
            {currency}
          </span>
        }
        className={cn("pl-14", className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

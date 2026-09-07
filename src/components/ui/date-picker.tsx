"use client";

// Custom date picker: an editable text input (dd/mm/yyyy) with a calendar icon
// anchored at the right edge that opens a popover-anchored calendar (built on
// @radix-ui/react-popover + date-fns). Users can either type the date directly
// or click the icon to pick it. Canonical API is Date-based; for ISO-string
// state, convert at the call site with fromIsoDate/toIsoDate from @/lib/dates.
import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// The format used for both display and manual typing.
const INPUT_FORMAT = "dd/MM/yyyy";

// Mask raw keystrokes into dd/mm/yyyy: keep digits only, cap at 8, insert the
// slashes after the day and month segments, and constrain each segment so an
// impossible day (> 31) or month (> 12) can never be typed. A leading digit
// that could only start an out-of-range value is auto-padded with a zero
// (e.g. "5" → "05", "2" → "02" for the month) so the entry advances cleanly.
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  let day = digits.slice(0, 2);
  let month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  // Day: 01–31. A lone digit > 3 can't lead a valid day, so pad it.
  if (day.length === 1) {
    if (Number(day) > 3) day = `0${day}`;
  } else if (day.length === 2 && Number(day) > 31) {
    day = "31";
  }

  // Month: 01–12. A lone digit > 1 can't lead a valid month, so pad it.
  if (month.length === 1) {
    if (Number(month) > 1) month = `0${month}`;
  } else if (month.length === 2 && Number(month) > 12) {
    month = "12";
  }

  return [day, month, year].filter(Boolean).join("/");
}

// Parse a fully-typed dd/MM/yyyy string into a Date, rejecting partial or
// rolled-over values (e.g. 32/01/2024) by round-tripping through format().
function parseDateInput(text: string): Date | null {
  if (text.length !== INPUT_FORMAT.length) return null;
  const parsed = parse(text, INPUT_FORMAT, new Date());
  if (!isValid(parsed) || format(parsed, INPUT_FORMAT) !== text) return null;
  return parsed;
}

interface DatePickerProps {
  id?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  /** Show the inline clear (×) button when a date is set. Defaults to true. */
  clearable?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      id,
      value,
      onChange,
      placeholder = "dd/mm/yyyy",
      disabled,
      minDate,
      maxDate,
      className,
      clearable = true,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    // Local text mirrors the input while typing; committed to `value` on a
    // valid parse. Synced back whenever the external value changes.
    const [text, setText] = React.useState(() =>
      value ? format(value, INPUT_FORMAT) : ""
    );

    React.useEffect(() => {
      setText(value ? format(value, INPUT_FORMAT) : "");
    }, [value]);

    const withinRange = React.useCallback(
      (d: Date) => {
        if (minDate) {
          const min = new Date(minDate);
          min.setHours(0, 0, 0, 0);
          if (d < min) return false;
        }
        if (maxDate) {
          const max = new Date(maxDate);
          max.setHours(23, 59, 59, 999);
          if (d > max) return false;
        }
        return true;
      },
      [minDate, maxDate]
    );

    const handleTextChange = (raw: string) => {
      const masked = maskDateInput(raw);
      setText(masked);
      if (masked === "") {
        onChange(null);
        return;
      }
      const parsed = parseDateInput(masked);
      if (parsed && withinRange(parsed)) onChange(parsed);
    };

    // On blur, snap the text back to the committed value (or clear it) so a
    // half-typed or out-of-range entry never lingers in the field.
    const handleBlur = () => {
      setText(value ? format(value, INPUT_FORMAT) : "");
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div
            className={cn(
              "relative flex h-10 w-full items-center rounded-md border border-border bg-background",
              "focus-within:ring-2 focus-within:ring-primary",
              disabled && "opacity-50 pointer-events-none",
              className
            )}
          >
            <input
              ref={ref}
              id={id}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              placeholder={placeholder}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onBlur={handleBlur}
              className={cn(
                // min-w-0 lets flex-1 actually shrink the input in narrow
                // containers; without it the input keeps its intrinsic width
                // and pushes the calendar icon outside the bordered box.
                "h-full min-w-0 flex-1 bg-transparent pl-3 pr-2 text-sm outline-none",
                "placeholder:text-muted-foreground"
              )}
            />

            {clearable && value && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Clear date"
                onClick={() => onChange(null)}
                className="mr-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              aria-label="Open calendar"
              disabled={disabled}
              onClick={() => setOpen((o) => !o)}
              className="flex h-full items-center rounded-r-md px-2.5 text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </PopoverAnchor>
        {/* collisionPadding + a max-height bound to Radix's available-height
            keep the (tall) calendar inside the viewport: when the field sits
            low on screen and the popover flips upward, it scrolls internally
            instead of overflowing under the browser's top toolbar. */}
        <PopoverContent
          align="start"
          collisionPadding={8}
          className="w-auto p-0 max-h-(--radix-popover-content-available-height) overflow-y-auto"
        >
          <Calendar
            selected={value}
            minDate={minDate}
            maxDate={maxDate}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DatePicker.displayName = "DatePicker";

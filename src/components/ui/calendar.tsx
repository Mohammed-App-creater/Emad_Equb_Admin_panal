"use client";

// Custom calendar built on date-fns (no react-day-picker dependency). Three
// views — days, months, years — so jumping across decades (e.g. birth dates)
// takes a couple of clicks instead of scrolling a long list.
// Used by <DatePicker>; can also be embedded directly for inline calendars.
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

type View = "days" | "months" | "years";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Years shown per page in the years view.
const YEARS_PER_PAGE = 12;

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const [viewMonth, setViewMonth] = React.useState<Date>(
    startOfMonth(selected ?? new Date())
  );
  const [view, setView] = React.useState<View>("days");

  // Follow the selected date if it's changed to a different month externally.
  React.useEffect(() => {
    if (selected) setViewMonth(startOfMonth(selected));
  }, [selected]);

  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;

  const monthDisabled = (d: Date) =>
    (!!min && isBefore(endOfMonth(d), min)) ||
    (!!max && isAfter(startOfMonth(d), max));
  const yearDisabled = (year: number) => {
    const d = setYear(new Date(2000, 0, 1), year);
    return (
      (!!min && isBefore(endOfYear(d), min)) ||
      (!!max && isAfter(startOfYear(d), max))
    );
  };

  return (
    <div className={cn("w-72 p-3 select-none", className)}>
      {view === "days" && (
        <DaysView
          viewMonth={viewMonth}
          selected={selected}
          min={min}
          max={max}
          onPrev={() => setViewMonth((m) => subMonths(m, 1))}
          onNext={() => setViewMonth((m) => addMonths(m, 1))}
          onHeaderClick={() => setView("months")}
          onSelect={(d) => onSelect?.(d)}
        />
      )}

      {view === "months" && (
        <GridView
          label={String(viewMonth.getFullYear())}
          onHeaderClick={() => setView("years")}
          onPrev={() => setViewMonth((m) => subYears(m, 1))}
          onNext={() => setViewMonth((m) => addYears(m, 1))}
          prevDisabled={
            !!min && isBefore(endOfYear(subYears(viewMonth, 1)), min)
          }
          nextDisabled={
            !!max && isAfter(startOfYear(addYears(viewMonth, 1)), max)
          }
          items={MONTHS_SHORT.map((m, i) => ({
            key: i,
            label: m,
            selected:
              !!selected &&
              selected.getFullYear() === viewMonth.getFullYear() &&
              selected.getMonth() === i,
            disabled: monthDisabled(setMonth(viewMonth, i)),
          }))}
          onPick={(i) => {
            setViewMonth((m) => setMonth(m, i));
            setView("days");
          }}
        />
      )}

      {view === "years" && (
        <YearsView
          viewYear={viewMonth.getFullYear()}
          selectedYear={selected?.getFullYear()}
          yearDisabled={yearDisabled}
          onPick={(year) => {
            setViewMonth((m) => setYear(m, year));
            setView("months");
          }}
        />
      )}
    </div>
  );
}

// ---- Days -------------------------------------------------------------------

function DaysView({
  viewMonth,
  selected,
  min,
  max,
  onPrev,
  onNext,
  onHeaderClick,
  onSelect,
}: {
  viewMonth: Date;
  selected?: Date | null;
  min?: Date;
  max?: Date;
  onPrev: () => void;
  onNext: () => void;
  onHeaderClick: () => void;
  onSelect: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const dayDisabled = (d: Date) => {
    const day = startOfDay(d);
    return (!!min && isBefore(day, min)) || (!!max && isAfter(day, max));
  };

  const prevDisabled = !!min && isBefore(endOfMonth(subMonths(viewMonth, 1)), min);
  const nextDisabled = !!max && isAfter(startOfMonth(addMonths(viewMonth, 1)), max);

  return (
    <>
      <Header
        label={`${MONTHS_LONG[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`}
        onHeaderClick={onHeaderClick}
        onPrev={onPrev}
        onNext={onNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="h-8 flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const outside = !isSameMonth(day, viewMonth);
          const isSelected = !!selected && isSameDay(day, selected);
          const isCurrent = isSameDay(day, new Date());
          const disabled = dayDisabled(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                "h-9 w-9 mx-auto flex items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                outside && "text-muted-foreground/40",
                !outside && !isSelected && "text-foreground",
                isCurrent &&
                  !isSelected &&
                  "ring-1 ring-inset ring-primary/40 font-semibold",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary font-semibold",
                disabled &&
                  "text-muted-foreground/30 hover:bg-transparent pointer-events-none"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---- Months (and generic 3-col grid) ---------------------------------------

function GridView({
  label,
  onHeaderClick,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  items,
  onPick,
}: {
  label: string;
  onHeaderClick?: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  items: { key: number; label: string; selected: boolean; disabled: boolean }[];
  onPick: (key: number) => void;
}) {
  return (
    <>
      <Header
        label={label}
        onHeaderClick={onHeaderClick}
        onPrev={onPrev}
        onNext={onNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            onClick={() => onPick(item.key)}
            className={cn(
              "h-11 flex items-center justify-center rounded-md text-sm transition-colors",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
              item.selected
                ? "bg-primary text-primary-foreground hover:bg-primary font-semibold"
                : "text-foreground",
              item.disabled &&
                "text-muted-foreground/30 hover:bg-transparent pointer-events-none"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ---- Years ------------------------------------------------------------------

function YearsView({
  viewYear,
  selectedYear,
  yearDisabled,
  onPick,
}: {
  viewYear: number;
  selectedYear?: number;
  yearDisabled: (year: number) => boolean;
  onPick: (year: number) => void;
}) {
  // Page of years aligned to a fixed block so paging is stable.
  const [pageStart, setPageStart] = React.useState(
    () => viewYear - (((viewYear % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE)
  );

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i);
  const allPrevDisabled = years.every((y) => yearDisabled(y - YEARS_PER_PAGE));
  const allNextDisabled = years.every((y) => yearDisabled(y + YEARS_PER_PAGE));

  return (
    <GridView
      label={`${pageStart} – ${pageStart + YEARS_PER_PAGE - 1}`}
      onPrev={() => setPageStart((s) => s - YEARS_PER_PAGE)}
      onNext={() => setPageStart((s) => s + YEARS_PER_PAGE)}
      prevDisabled={allPrevDisabled}
      nextDisabled={allNextDisabled}
      items={years.map((y) => ({
        key: y,
        label: String(y),
        selected: selectedYear === y,
        disabled: yearDisabled(y),
      }))}
      onPick={onPick}
    />
  );
}

// ---- Shared header ----------------------------------------------------------

function Header({
  label,
  onHeaderClick,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  label: string;
  onHeaderClick?: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <button
        type="button"
        aria-label="Previous"
        disabled={prevDisabled}
        onClick={onPrev}
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        disabled={!onHeaderClick}
        onClick={onHeaderClick}
        className={cn(
          "flex-1 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors",
          onHeaderClick
            ? "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            : "cursor-default"
        )}
      >
        {label}
      </button>

      <button
        type="button"
        aria-label="Next"
        disabled={nextDisabled}
        onClick={onNext}
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

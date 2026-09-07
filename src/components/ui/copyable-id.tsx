"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyableIdProps {
  /** The full identifier (e.g. a UUID). */
  value: string;
  /**
   * What to display. Defaults to the segment before the first "-" so long
   * UUIDs collapse to their first block; the full value stays available via
   * the hover tooltip and the copy button.
   */
  display?: string;
  className?: string;
}

// Compact identifier cell: shows a short label, reveals the full value on
// hover, and copies the full value on click. Built for table cells where a
// raw UUID would otherwise eat horizontal space.
export const CopyableId: React.FC<CopyableIdProps> = ({
  value,
  display,
  className,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const shortLabel = display ?? (value ? value.split("-")[0] : "");

  const handleCopy = async (e: React.MouseEvent) => {
    // Rows are often clickable; don't trigger the row's navigation.
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied", description: "ID copied to clipboard." });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Copy the ID manually.",
        variant: "destructive",
      });
    }
  };

  if (!value) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <span className={cn("inline-flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono truncate">{shortLabel}</span>
          </TooltipTrigger>
          <TooltipContent className="font-mono">{value}</TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy ID"
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </span>
    </TooltipProvider>
  );
};

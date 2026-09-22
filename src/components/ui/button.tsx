import * as React from "react"
import { cn } from "@/lib/utils"

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "default"

type Size = "sm" | "md" | "lg"

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      className={cn(
        // Base
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",

        // Sizes
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",

        // Variants
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:opacity-90",

        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:opacity-90",

        variant === "outline" &&
          "border border-border bg-transparent  hover:bg-accent hover:text-accent-foreground",

        variant === "destructive" &&
          "bg-destructive text-destructive-foreground hover:opacity-90",

        variant === "ghost" &&
          "bg-transparent text-foreground hover:bg-muted",

        variant === "default" &&
          "bg-card text-foreground border border-border",

        className
      )}
      {...props}
    />
  )
}

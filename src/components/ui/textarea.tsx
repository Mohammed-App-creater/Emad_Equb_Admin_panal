import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary",
        className
      )}
      {...props}
    />
  );
}

import { AlertCircle } from "lucide-react";

/**
 * Summary box shown at the top of a form when submission is blocked by
 * validation. Complements the per-field inline messages: the fields tell the
 * user *where* the problem is, this tells them *what* still needs fixing in one
 * place (and a clear "please try again" cue).
 */
export function FormErrorSummary({
  messages,
  title = "Please fix the following and try again",
  className,
}: {
  messages: string[];
  title?: string;
  className?: string;
}) {
  // De-duplicate identical messages so the same generic error isn't repeated.
  const unique = Array.from(new Set(messages.filter(Boolean)));
  if (unique.length === 0) return null;

  return (
    <div
      role="alert"
      className={`rounded-xl border border-destructive/40 bg-destructive/5 p-4 ${
        className ?? ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">{title}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {unique.map((msg, i) => (
              <li key={i} className="text-xs text-destructive/90">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { useUI } from "@/context/ui-context";

export function GlobalLoader() {
  const { loadingCount } = useUI();
  if (loadingCount === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

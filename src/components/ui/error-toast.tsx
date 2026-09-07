import { useUI } from "@/context/ui-context";
import { useEffect } from "react";

export function ErrorToast() {
  const { error, setError } = useUI();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000); // auto-hide
    return () => clearTimeout(timer);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div className="fixed top-5 right-5 z-50 rounded-md bg-danger p-4 text-white shadow-md">
      {error}
    </div>
  );
}

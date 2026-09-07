"use client";
import React, { createContext, useContext, useState } from "react";

interface UIContextValue {
  loadingCount: number;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (message: string | null) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const setLoading = (isLoading: boolean) => {
    setLoadingCount((prev) => (isLoading ? prev + 1 : Math.max(prev - 1, 0)));
  };

  return (
    <UIContext.Provider value={{ loadingCount, error, setLoading, setError }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
};

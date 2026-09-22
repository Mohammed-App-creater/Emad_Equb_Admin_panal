"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query/query-client";
import { ReactNode } from "react";
import { ErrorToast } from "@/components/ui/error-toast";
import { GlobalLoader } from "@/components/ui/loader-full";
import { UIProvider } from "@/context/ui-context";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <UIProvider>
          <GlobalLoader />
          <ErrorToast />
          {children}
        </UIProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

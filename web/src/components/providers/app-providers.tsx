"use client";

import type { ReactNode } from "react";
import { useAuthBootstrap } from "@/features/auth/hooks/use-auth-bootstrap";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  useAuthBootstrap();
  return <>{children}</>;
}


import type { ReactNode } from "react";
import { MainNav } from "@/components/layout/main-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <MainNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-app px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

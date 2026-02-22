import type { ReactNode } from "react";

type MessagesLayoutProps = {
  children: ReactNode;
};

export default function MessagesLayout({ children }: MessagesLayoutProps) {
  return <div className="h-[calc(100vh-7rem)] overflow-hidden">{children}</div>;
}


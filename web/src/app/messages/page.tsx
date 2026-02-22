import { requireSession } from "@/lib/auth/require-session";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";

export default async function MessagesPage() {
  const session = await requireSession("/messages");

  return <ChatWorkspace userId={session.uid} />;
}

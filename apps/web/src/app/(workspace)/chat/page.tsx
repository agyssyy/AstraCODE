import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@astracode/ui";
import { ChatView } from "@/components/chat/chat-view";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ChatView />
    </Suspense>
  );
}

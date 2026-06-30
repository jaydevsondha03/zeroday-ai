import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/cyber/AppShell";
import { MessageSquareCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Security Assistant — AI-ZeroDay-Predictor" }] }),
  component: ChatLayout,
});

const NOUPE_SRC = "https://www.noupe.com/embed/019f1761a61a7672ad719334adffb8e4e896.js";

function ChatLayout() {
  useEffect(() => {
    // Inject Noupe widget once
    if (document.querySelector(`script[src="${NOUPE_SRC}"]`)) return;
    const s = document.createElement("script");
    s.src = NOUPE_SRC;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="glass max-w-xl p-10 text-center">
          <MessageSquareCode className="mx-auto mb-4 h-12 w-12 text-neon-cyan" />
          <h1 className="font-display text-2xl neon-text mb-2">AI Security Assistant</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your AI assistant is ready. Tap the chat bubble in the bottom corner to ask about
            vulnerabilities, paste code for review, or request a CVE fix.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Powered by Noupe AI · Conversations are handled by the embedded chatbot widget.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

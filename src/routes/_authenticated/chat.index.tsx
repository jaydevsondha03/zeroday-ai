import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { MessageSquareCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createThread);
  const mut = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
    },
  });

  // No auto-create: let the user click to start.
  useEffect(() => { /* noop */ }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <MessageSquareCode className="h-12 w-12 text-neon-cyan" />
      <h2 className="font-display text-2xl neon-text">AI Security Assistant</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Threaded chat that explains vulnerabilities, suggests secure-coding fixes, and answers cybersecurity questions.
      </p>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground neon-glow"
      >
        {mut.isPending ? "Starting…" : "Start a new conversation"}
      </button>
    </div>
  );
}

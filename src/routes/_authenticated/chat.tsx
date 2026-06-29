import { createFileRoute, Outlet, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

const threadsQO = queryOptions({ queryKey: ["threads"], queryFn: () => listThreads() });

export const Route = createFileRoute("/_authenticated/chat")({
  loader: ({ context }) => context.queryClient.ensureQueryData(threadsQO),
  head: () => ({ meta: [{ title: "AI Security Assistant — AI-ZeroDay-Predictor" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  const { data: threads } = useSuspenseQuery(threadsQO);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);

  const newThread = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
  });

  const removeThread = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (params.threadId === id) navigate({ to: "/chat" });
    },
  });

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-6rem)] grid-cols-[260px_1fr] gap-4">
        <div className="glass flex flex-col p-3">
          <Button onClick={() => newThread.mutate()} className="neon-glow mb-3" disabled={newThread.isPending}>
            <Plus className="mr-2 h-4 w-4" />New conversation
          </Button>
          <div className="flex-1 space-y-1 overflow-auto">
            {threads.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No conversations yet.</p>
            )}
            {threads.map((t) => {
              const active = params.threadId === t.id;
              return (
                <div key={t.id} className={`group flex items-center rounded-md ${active ? "bg-accent neon-glow" : "hover:bg-accent/50"}`}>
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    className="flex flex-1 min-w-0 items-center gap-2 px-3 py-2 text-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-neon-cyan" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    onClick={() => removeThread.mutate(t.id)}
                    className="px-2 py-2 text-muted-foreground opacity-0 transition-opacity hover:text-neon-red group-hover:opacity-100"
                    aria-label="Delete thread"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass overflow-hidden">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}

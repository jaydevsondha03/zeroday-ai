import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getThreadMessages, renameThread } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  return <ChatWindow key={threadId} threadId={threadId} />;
}

function ChatWindow({ threadId }: { threadId: string }) {
  const getMessages = useServerFn(getThreadMessages);
  const rename = useServerFn(renameThread);
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: initial } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => getMessages({ data: { threadId } }),
    staleTime: Infinity,
  });

  const initialMessages = useMemo(
    () => (initial?.messages ?? []) as unknown as UIMessage[],
    [initial],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, id }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            headers,
            body: { messages, threadId: id },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "Chat error"),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage({ text });
    // Rename thread to first user message if it's still default
    if (messages.length === 0) {
      const title = text.slice(0, 60);
      rename({ data: { id: threadId, title } }).then(() =>
        qc.invalidateQueries({ queryKey: ["threads"] })
      ).catch(() => {});
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/40 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
        AI Security Assistant
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-5">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-md text-center text-sm text-muted-foreground">
            Ask about a vulnerability, paste code for review, or request a fix for a CVE.
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                isUser ? "bg-primary text-primary-foreground" : "glass"
              }`}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyst is thinking…
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border/40 p-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a vulnerability…"
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()} className="neon-glow">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `You are the AI Security Assistant for AI-ZeroDay-Predictor.
You help developers and security researchers understand vulnerabilities, suggest secure-coding fixes, and explain attack prevention.
- Be concise and technical but accessible.
- Format answers in markdown with code blocks where relevant.
- When asked to review code, point out concrete vulnerabilities with line-level reasoning and a fix.
- Refuse to write offensive exploits or working malware; explain defensive context instead.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token || token.split(".").length !== 3) {
            return new Response("Unauthorized", { status: 401 });
          }

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });

          const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });
          const userId = claims.claims.sub;

          const body = (await request.json()) as { messages: UIMessage[]; threadId?: string };
          const { messages, threadId } = body;
          if (!Array.isArray(messages) || !threadId) {
            return new Response("Bad request", { status: 400 });
          }

          // Verify thread belongs to user
          const { data: thread } = await supabase
            .from("chat_threads").select("id").eq("id", threadId).maybeSingle();
          if (!thread) return new Response("Forbidden", { status: 403 });

          // Persist the newest user message (last item) if not already saved.
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === "user") {
            await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "user",
              message: lastMsg as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["message"],
            });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
          const gateway = createLovableAiGatewayProvider(key);

          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ messages: finalMessages }) => {
              const assistantMsg = finalMessages[finalMessages.length - 1];
              if (assistantMsg && assistantMsg.role === "assistant") {
                await supabase.from("chat_messages").insert({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  message: assistantMsg as unknown as Database["public"]["Tables"]["chat_messages"]["Insert"]["message"],
                });
                await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
              }
            },
          });
        } catch (err) {
          console.error("chat route error:", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { analyzeThreat } from "@/lib/predictions.functions";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AnalysisReport } from "@/components/cyber/AnalysisReport";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze — AI-ZeroDay-Predictor" },
      { name: "description", content: "Multi-surface threat scanner for URLs, code snippets, and system logs with deterministic scoring and AI explanations." },
      { property: "og:title", content: "Threat analyzer — AI-ZeroDay-Predictor" },
      { property: "og:description", content: "Scan URLs, code, and logs with a weighted rule engine and an AI security analyst." },
      { property: "og:url", content: "https://zeroday-ai.lovable.app/analyze" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://zeroday-ai.lovable.app/analyze" }],
  }),
  component: AnalyzePage,
});

type InputType = "url" | "code" | "log";

const PLACEHOLDERS: Record<InputType, string> = {
  url: "https://example.com/login?next=/admin",
  code: `// Paste a code snippet (JS, Python, ...)
const q = "SELECT * FROM users WHERE id = " + req.query.id;
db.query(q);`,
  log: `192.168.1.10 - - [29/Jun/2026] "GET /?id=1' OR 1=1-- HTTP/1.1" 200
192.168.1.10 - - [29/Jun/2026] "GET /admin HTTP/1.1" 401`,
};

function AnalyzePage() {
  const [tab, setTab] = useState<InputType>("url");
  const [urlValue, setUrlValue] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [logValue, setLogValue] = useState("");
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeThreat);

  const value = tab === "url" ? urlValue : tab === "code" ? codeValue : logValue;

  const mutation = useMutation({
    mutationFn: (payload: { input_type: InputType; input_text: string }) => analyze({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  function run() {
    if (!value.trim()) return toast.error("Provide input first.");
    mutation.mutate({ input_type: tab, input_text: value });
  }

  const result = mutation.data;

  return (
    <AppShell>
      <h1 className="font-display text-2xl sm:text-3xl">Threat analyzer</h1>
      <p className="text-sm text-muted-foreground">Multi-surface scanner — deterministic scoring + AI explanation.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InputType)} className="mt-6">
        <TabsList className="bg-card">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="url">
          <div className="glass mt-4 p-4 sm:p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Target URL</label>
            <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder={PLACEHOLDERS.url} className="mt-2 font-sans" />
          </div>
        </TabsContent>
        <TabsContent value="code">
          <div className="glass mt-4 p-4 sm:p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Source code</label>
            <Textarea value={codeValue} onChange={(e) => setCodeValue(e.target.value)} placeholder={PLACEHOLDERS.code} rows={12} className="mt-2 font-mono text-sm" spellCheck={false} />
          </div>
        </TabsContent>
        <TabsContent value="log">
          <div className="glass mt-4 p-4 sm:p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Server / API log</label>
            <Textarea value={logValue} onChange={(e) => setLogValue(e.target.value)} placeholder={PLACEHOLDERS.log} rows={12} className="mt-2 font-mono text-sm" spellCheck={false} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end">
        <Button onClick={run} disabled={mutation.isPending} className="neon-glow">
          {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : "Analyze Threat"}
        </Button>
      </div>

      {result && <AnalysisReport result={result} />}
    </AppShell>
  );
}


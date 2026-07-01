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
import { Progress } from "@/components/ui/progress";
import { Loader2, ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
      <h1 className="font-display text-3xl">Threat analyzer</h1>
      <p className="text-sm text-muted-foreground">Multi-surface scanner — deterministic scoring + AI explanation.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InputType)} className="mt-6">
        <TabsList className="bg-card">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="url">
          <div className="glass mt-4 p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Target URL</label>
            <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder={PLACEHOLDERS.url} className="mt-2 font-sans" />
          </div>
        </TabsContent>
        <TabsContent value="code">
          <div className="glass mt-4 p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Source code</label>
            <Textarea value={codeValue} onChange={(e) => setCodeValue(e.target.value)} placeholder={PLACEHOLDERS.code} rows={12} className="mt-2 font-mono text-sm" spellCheck={false} />
          </div>
        </TabsContent>
        <TabsContent value="log">
          <div className="glass mt-4 p-5">
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

      {result && <Report result={result} />}
    </AppShell>
  );
}

type ResultRow = {
  risk_score: number | string; risk_level: string; breakdown: unknown;
  vulnerabilities: unknown;
  ai_explanation: string | null;
};

const LEVEL_ICON: Record<string, typeof ShieldCheck> = {
  Safe: ShieldCheck, Moderate: ShieldQuestion, High: ShieldAlert, Critical: ShieldX,
};
const LEVEL_COLOR: Record<string, string> = {
  Safe: "text-neon-green", Moderate: "text-neon-amber", High: "text-neon-violet", Critical: "text-neon-red",
};
const SEV_COLOR: Record<string, string> = {
  low: "border-neon-cyan/40 text-neon-cyan",
  medium: "border-neon-amber/40 text-neon-amber",
  high: "border-neon-violet/40 text-neon-violet",
  critical: "border-neon-red/50 text-neon-red",
};

function Report({ result }: { result: ResultRow }) {
  const Icon = LEVEL_ICON[result.risk_level] ?? ShieldQuestion;
  const breakdown = (result.breakdown ?? {}) as Record<string, number>;
  const vulns = (result.vulnerabilities ?? []) as Array<{ id: string; title: string; severity: string; evidence: string }>;
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className={`glass p-6 lg:col-span-1 neon-glow`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${LEVEL_COLOR[result.risk_level]}`} />
          <div>
            <div className="text-xs uppercase text-muted-foreground">Risk level</div>
            <div className={`font-display text-2xl ${LEVEL_COLOR[result.risk_level]}`}>{result.risk_level}</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase text-muted-foreground">Risk score</div>
          <div className="mt-1 font-display text-6xl neon-text">{Number(result.risk_score).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">/ 100 — deterministic</div>
        </div>
        <div className="mt-6 space-y-3">
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                <span>{v}</span>
              </div>
              <Progress value={Number(v)} className="mt-1 h-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6 lg:col-span-2">
        <h2 className="mb-4 font-display text-lg">Detected vulnerabilities</h2>
        {vulns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No explicit signature matches. Score reflects baseline heuristics.</p>
        ) : (
          <ul className="space-y-2">
            {vulns.map((v) => (
              <li key={v.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{v.title}</span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${SEV_COLOR[v.severity]}`}>{v.severity}</span>
                </div>
                <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">{v.evidence}</code>
              </li>
            ))}
          </ul>
        )}

        {result.ai_explanation && (
          <>
            <h2 className="mt-6 mb-2 font-display text-lg">AI security analyst</h2>
            <div className="prose prose-invert prose-sm max-w-none rounded-md border border-border/60 bg-background/40 p-4">
              <ReactMarkdown>{result.ai_explanation}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { Progress } from "@/components/ui/progress";
import { ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";
import ReactMarkdown from "react-markdown";

export type ResultRow = {
  risk_score: number | string;
  risk_level: string;
  breakdown: unknown;
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

export function AnalysisReport({ result }: { result: ResultRow }) {
  const Icon = LEVEL_ICON[result.risk_level] ?? ShieldQuestion;
  const breakdown = (result.breakdown ?? {}) as Record<string, number>;
  const vulns = (result.vulnerabilities ?? []) as Array<{ id: string; title: string; severity: string; evidence: string }>;
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="glass p-6 lg:col-span-1 neon-glow">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${LEVEL_COLOR[result.risk_level]}`} />
          <div>
            <div className="text-xs uppercase text-muted-foreground">Risk level</div>
            <div className={`font-display text-2xl ${LEVEL_COLOR[result.risk_level]}`}>{result.risk_level}</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase text-muted-foreground">Risk score</div>
          <div className="mt-1 font-display text-5xl neon-text sm:text-6xl">{Number(result.risk_score).toFixed(2)}</div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
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

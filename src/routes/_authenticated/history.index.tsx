import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, queryOptions, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { listPredictions, deletePrediction } from "@/lib/predictions.functions";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const predictionsQO = queryOptions({ queryKey: ["predictions"], queryFn: () => listPredictions() });

export const Route = createFileRoute("/_authenticated/history/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(predictionsQO),
  head: () => ({
    meta: [
      { title: "History — AI-ZeroDay-Predictor" },
      { name: "description", content: "Browse and filter your past zero-day vulnerability scans with severity, input type, and timestamp." },
      { property: "og:title", content: "Scan history — AI-ZeroDay-Predictor" },
      { property: "og:description", content: "Filterable log of your previous threat scans and their AI-generated findings." },
      { property: "og:url", content: "https://zeroday-ai.lovable.app/history" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://zeroday-ai.lovable.app/history" }],
  }),
  component: HistoryPage,
});

const LEVEL_COLOR: Record<string, string> = {
  Safe: "text-neon-green border-neon-green/40",
  Moderate: "text-neon-amber border-neon-amber/40",
  High: "text-neon-violet border-neon-violet/40",
  Critical: "text-neon-red border-neon-red/50",
};

function HistoryPage() {
  const { data: predictions } = useSuspenseQuery(predictionsQO);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const qc = useQueryClient();
  const del = useServerFn(deletePrediction);

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Deleted");
    },
  });

  const filtered = predictions.filter((p) => {
    if (level !== "all" && p.risk_level !== level) return false;
    if (search && !p.input_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl sm:text-3xl">Scan history</h1>
      <p className="text-sm text-muted-foreground">All prior threat analyses on this account. Tap a row to view the full report.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search inputs…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="Safe">Safe</SelectItem>
            <SelectItem value="Moderate">Moderate</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">No matching scans.</div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="glass group flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <Link to="/history/$id" params={{ id: p.id }} className="flex flex-1 items-center gap-3 sm:gap-4 min-w-0">
              <div className="font-display text-2xl sm:text-3xl neon-text w-14 sm:w-20 text-center shrink-0">{Number(p.risk_score).toFixed(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${LEVEL_COLOR[p.risk_level]}`}>{p.risk_level}</span>
                  <span className="text-xs uppercase text-muted-foreground">{p.input_type}</span>
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                </div>
                <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">{p.input_text.slice(0, 160)}</code>
              </div>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground group-hover:text-neon-cyan sm:block" />
            </Link>
            <Button variant="ghost" size="icon" aria-label="Delete scan" onClick={() => removeMut.mutate(p.id)} className="shrink-0 text-muted-foreground hover:text-neon-red">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

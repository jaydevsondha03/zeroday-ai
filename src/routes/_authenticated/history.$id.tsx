import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/cyber/AppShell";
import { getPrediction } from "@/lib/predictions.functions";
import { AnalysisReport } from "@/components/cyber/AnalysisReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history/$id")({
  head: () => ({
    meta: [
      { title: "Scan report — AI-ZeroDay-Predictor" },
      { name: "description", content: "Full prediction report with risk score, breakdown, vulnerabilities, and AI analysis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryDetail,
});

function shouldRetryProtectedQuery(failureCount: number, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Unauthorized") || message.includes("Not found")) return false;
  return failureCount < 2;
}

function HistoryDetail() {
  const { id } = Route.useParams();
  const fetchPrediction = useServerFn(getPrediction);
  const reportQuery = useQuery({
    queryKey: ["prediction", id],
    queryFn: () => fetchPrediction({ data: { id } }),
    retry: shouldRetryProtectedQuery,
  });

  const { data } = reportQuery;

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>
      </div>
      <h1 className="font-display text-2xl sm:text-3xl">Scan report</h1>

      {reportQuery.isLoading && (
        <div className="glass mt-6 flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" /> Loading archived report…
        </div>
      )}

      {reportQuery.isError && (
        <div className="glass mt-6 p-6">
          <h2 className="font-display text-lg text-neon-red">Report unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {reportQuery.error instanceof Error ? reportQuery.error.message : "Unable to load this archived report."}
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => reportQuery.refetch()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      )}

      {data && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="uppercase">{data.input_type}</span> · {new Date(data.created_at).toLocaleString()}
          </p>

          <div className="glass mt-4 p-4">
            <div className="text-xs uppercase text-muted-foreground">Input</div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{data.input_text}</pre>
          </div>

          <AnalysisReport result={data} />
        </>
      )}
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { getPrediction } from "@/lib/predictions.functions";
import { AnalysisReport } from "@/components/cyber/AnalysisReport";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["prediction", params.id],
        queryFn: () => getPrediction({ data: { id: params.id } }),
      }),
    ),
  head: () => ({
    meta: [
      { title: "Scan report — AI-ZeroDay-Predictor" },
      { name: "description", content: "Full prediction report with risk score, breakdown, vulnerabilities, and AI analysis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryDetail,
});

function HistoryDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["prediction", id],
      queryFn: () => getPrediction({ data: { id } }),
    }),
  );

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>
      </div>
      <h1 className="font-display text-2xl sm:text-3xl">Scan report</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="uppercase">{data.input_type}</span> · {new Date(data.created_at).toLocaleString()}
      </p>

      <div className="glass mt-4 p-4">
        <div className="text-xs uppercase text-muted-foreground">Input</div>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{data.input_text}</pre>
      </div>

      <AnalysisReport result={data} />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { listPredictions } from "@/lib/predictions.functions";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import { Shield, AlertTriangle, Activity, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";

const predictionsQO = queryOptions({
  queryKey: ["predictions"],
  queryFn: () => listPredictions(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(predictionsQO),
  head: () => ({ meta: [{ title: "Dashboard — AI-ZeroDay-Predictor" }] }),
  component: Dashboard,
});

const LEVEL_COLORS: Record<string, string> = {
  Safe: "oklch(0.85 0.22 145)",
  Moderate: "oklch(0.83 0.18 75)",
  High: "oklch(0.72 0.22 295)",
  Critical: "oklch(0.68 0.25 22)",
};

function Dashboard() {
  const { data: predictions } = useSuspenseQuery(predictionsQO);

  const total = predictions.length;
  const critical = predictions.filter((p) => p.risk_level === "Critical").length;
  const high = predictions.filter((p) => p.risk_level === "High").length;
  const avgScore = total ? Math.round((predictions.reduce((a, p) => a + Number(p.risk_score), 0) / total) * 10) / 10 : 0;

  const levelData = ["Safe", "Moderate", "High", "Critical"].map((l) => ({
    name: l, value: predictions.filter((p) => p.risk_level === l).length,
  })).filter((d) => d.value > 0);

  const typeData = ["url", "code", "log"].map((t) => ({
    type: t.toUpperCase(),
    avg: (() => {
      const subset = predictions.filter((p) => p.input_type === t);
      if (!subset.length) return 0;
      return Math.round((subset.reduce((a, p) => a + Number(p.risk_score), 0) / subset.length) * 10) / 10;
    })(),
  }));

  const recent = [...predictions].slice(0, 14).reverse().map((p, i) => ({
    idx: i + 1, score: Number(p.risk_score), level: p.risk_level,
  }));

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Threat dashboard</h1>
          <p className="text-sm text-muted-foreground">Risk analytics across your recent scans.</p>
        </div>
        <Link to="/analyze" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground neon-glow">
          New scan
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Target} label="Total scans" value={total} accent="cyan" />
        <StatCard icon={Activity} label="Avg risk score" value={avgScore} accent="amber" />
        <StatCard icon={AlertTriangle} label="High severity" value={high} accent="violet" />
        <StatCard icon={Shield} label="Critical" value={critical} accent="red" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Risk distribution">
          {levelData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip content={<PieTooltip total={total} />} />
                <Pie data={levelData} dataKey="value" nameKey="name" outerRadius={90} stroke="oklch(0.16 0.025 250)">
                  {levelData.map((d) => <Cell key={d.name} fill={LEVEL_COLORS[d.name]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="Average score by input type">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={typeData}>
              <CartesianGrid stroke="oklch(0.82 0.18 200 / 0.08)" />
              <XAxis dataKey="type" stroke="oklch(0.70 0.03 230)" />
              <YAxis domain={[0, 100]} stroke="oklch(0.70 0.03 230)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="avg" fill="oklch(0.82 0.18 200)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Recent risk timeline" className="lg:col-span-2">
          {recent.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={recent}>
                <CartesianGrid stroke="oklch(0.82 0.18 200 / 0.08)" />
                <XAxis dataKey="idx" stroke="oklch(0.70 0.03 230)" />
                <YAxis domain={[0, 100]} stroke="oklch(0.70 0.03 230)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.82 0.18 200)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>
    </AppShell>
  );
}

const tooltipStyle = {
  background: "oklch(0.18 0.028 252)", border: "1px solid oklch(0.82 0.18 200 / 0.3)", borderRadius: 8,
};

function PieTooltip({ active, payload, total }: { active?: boolean; payload?: Array<{ name: string; value: number }>; total: number }) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={tooltipStyle} className="px-2.5 py-1.5 text-xs text-foreground">
      <div className="font-medium">{name}</div>
      <div className="text-muted-foreground">{value} scans ({pct}%)</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      No scans yet. <Link to="/analyze" className="ml-1 text-neon-cyan underline">Run one</Link>.
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Shield; label: string; value: number; accent: "cyan" | "amber" | "violet" | "red" }) {
  const color = { cyan: "text-neon-cyan", amber: "text-neon-amber", violet: "text-neon-violet", red: "text-neon-red" }[accent];
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-3 font-display text-3xl ${color}`}>{value}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass p-5 ${className}`}>
      <h3 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Particles } from "@/components/cyber/Particles";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ScanLine, Brain, Activity, Lock, Cpu, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI-ZeroDay-Predictor — Predict. Prevent. Protect." },
      { name: "description", content: "Predict zero-day vulnerabilities in URLs, code snippets, and system logs with deterministic heuristic scoring and an AI security analyst." },
      { property: "og:title", content: "AI-ZeroDay-Predictor — Predict. Prevent. Protect." },
      { property: "og:description", content: "AI-powered cybersecurity intelligence — scan URLs, code, and logs to forecast zero-day vulnerabilities before exploitation." },
      { property: "og:url", content: "https://zeroday-ai.lovable.app/" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f0c91396-0c2b-46c6-8027-db57645f3a25" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f0c91396-0c2b-46c6-8027-db57645f3a25" },
      { name: "twitter:title", content: "AI-ZeroDay-Predictor — Predict. Prevent. Protect." },
      { name: "twitter:description", content: "AI-powered cybersecurity intelligence — scan URLs, code, and logs to forecast zero-day vulnerabilities before exploitation." },
    ],
    links: [{ rel: "canonical", href: "https://zeroday-ai.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="relative min-h-screen scan-lines">
      <Particles density={90} />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-neon-cyan" />
          <img src="/favicon.png" alt="AI-ZeroDay Logo" className="h-6 w-6 object-contain" />
          <span className="font-display tracking-widest neon-text">AI-ZERODAY</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {authed ? (
            <Link to="/dashboard" className="animate-pulse-neon inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" /> Go to dashboard
            </Link>
          ) : authed === false ? (
            <>
              <Link to="/auth" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/auth" search={{ mode: "register" }} className="animate-pulse-neon rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
                Get access
              </Link>
            </>
          ) : null}
        </nav>
      </header>

      <main>
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-accent px-3 py-1 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
          THREAT FEED · ONLINE
        </div>
        <h1 className="mt-6 font-display text-5xl leading-tight tracking-tight md:text-7xl">
          <span className="neon-text">Predict</span>. Prevent. Protect.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          AI-ZeroDay-Predictor analyzes URLs, source code, and system logs to forecast zero-day vulnerabilities before exploitation — using deterministic heuristic scoring and an AI security analyst.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {authed ? (
            <Link to="/dashboard" className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground neon-glow">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "register" }} className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground neon-glow">
                Start scanning
              </Link>
              <Link to="/auth" className="rounded-md border border-border bg-card px-6 py-3 font-medium backdrop-blur">
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: ScanLine, title: "Multi-surface scanner", desc: "URL, code, and log analyzers in one workspace with syntax-aware input." },
          { icon: Brain, title: "Deterministic AI scoring", desc: "Weighted heuristic engine: same input always yields the same risk score." },
          { icon: Activity, title: "Live risk dashboard", desc: "Track threat trends, severity distribution, and recent scans over time." },
          { icon: Lock, title: "Zero-day pattern library", desc: "30+ signatures covering SQLi, XSS, RCE, weak auth, CORS leaks, and more." },
          { icon: Cpu, title: "AI Security Assistant", desc: "Threaded chat to explain vulnerabilities and suggest secure-coding fixes." },
          { icon: Shield, title: "Built for researchers", desc: "Per-user history, secure auth, and exportable reports." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass p-6 transition-transform hover:-translate-y-1">
            <Icon className="h-6 w-6 text-neon-cyan" />
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        AI-ZeroDay-Predictor · Heuristic intelligence for defensive security research
      </footer>
    </div>
  );
}

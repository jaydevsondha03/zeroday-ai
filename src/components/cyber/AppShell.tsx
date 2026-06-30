import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Particles } from "./Particles";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, ScanLine, History, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <Particles />
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <aside className="glass m-3 flex flex-col gap-1 p-4">
          <Link to="/dashboard" className="mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-neon-cyan" />
            <div className="leading-tight">
              <div className="font-display text-sm tracking-widest neon-text">ZERODAY</div>
              <div className="text-[10px] text-muted-foreground">PREDICT · PREVENT · PROTECT</div>
            </div>
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeProps={{ className: "bg-accent text-foreground neon-glow" }}
                >
                  <Icon className="h-4 w-4 text-neon-cyan transition-transform group-hover:scale-110" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-neon-red">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>
        <main className="overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

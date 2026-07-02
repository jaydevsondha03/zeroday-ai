import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Particles } from "./Particles";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, ScanLine, History, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link to="/" onClick={onNavigate} className="mb-6 flex items-center gap-2">
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
              onClick={onNavigate}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground neon-glow" }}
            >
              <Icon className="h-4 w-4 text-neon-cyan transition-transform group-hover:scale-110" />
              {item.label}
            </Link>
          );
        })}
        <Link
          to="/profile"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{ className: "bg-accent text-foreground neon-glow" }}
        >
          <UserIcon className="h-4 w-4 text-neon-cyan transition-transform group-hover:scale-110" />
          Profile
        </Link>
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<{ url: string | null; initial: string }>({ url: null, initial: "?" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const initial = (u.user.user_metadata?.display_name || u.user.email || "?").charAt(0).toUpperCase();
      const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", u.user.id).maybeSingle();
      let url: string | null = null;
      if (prof?.avatar_url) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(prof.avatar_url, 60 * 60);
        url = signed?.signedUrl ?? null;
      }
      if (!cancelled) setAvatar({ url, initial });
    })();
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <Particles />

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-border/40 bg-background/95 p-4 backdrop-blur">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <SidebarContent onNavigate={() => setOpen(false)} />
              <div className="mt-auto">
                <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-neon-red">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-neon-cyan" />
          <span className="font-display text-sm tracking-widest neon-text">ZERODAY</span>
        </Link>
        <Link to="/profile" aria-label="Profile">
          <Avatar className="h-9 w-9 border border-neon-cyan/40">
            {avatar.url && <AvatarImage src={avatar.url} alt="Profile" />}
            <AvatarFallback className="bg-accent text-xs">{avatar.initial}</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <div className="md:grid md:min-h-screen md:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="glass m-3 hidden flex-col gap-1 p-4 md:flex">
          <SidebarContent />
          <div className="mt-auto">
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-neon-red">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex flex-col">
          {/* Desktop top bar (right-aligned avatar) */}
          <header className="hidden items-center justify-end px-6 py-3 md:flex">
            <Link to="/profile" aria-label="Profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
              <span className="text-xs text-muted-foreground">Profile</span>
              <Avatar className="h-9 w-9 border border-neon-cyan/40">
                {avatar.url && <AvatarImage src={avatar.url} alt="Profile" />}
                <AvatarFallback className="bg-accent text-xs">{avatar.initial}</AvatarFallback>
              </Avatar>
            </Link>
          </header>
          <main className="flex-1 overflow-auto px-4 py-4 md:px-6 md:py-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

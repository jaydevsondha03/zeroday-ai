import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Particles } from "@/components/cyber/Particles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — AI-ZeroDay-Predictor" },
      { name: "description", content: "Sign in or create an account to start scanning for zero-day vulnerabilities." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { mode } = Route.useSearch();
  const [isRegister, setIsRegister] = useState(mode === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const [registered, setRegistered] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name || email.split("@")[0] },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        // If email confirmation is required, session will be null
        if (!data.session) {
          setRegistered(email);
          toast.success("Check your inbox to confirm your email.");
          return;
        }
        toast.success("Account created. You're in.");
        router.navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        router.navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Particles density={70} />
      <div className="glass w-full max-w-md p-8 neon-glow">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-neon-cyan" />
          <span className="font-display tracking-widest neon-text">AI-ZERODAY</span>
        </Link>
        <h1 className="text-center font-display text-2xl">
          {isRegister ? "Create access" : "Authenticate"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isRegister ? "Provision your security workspace." : "Resume your threat intelligence session."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {isRegister && (
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="analyst-01" autoComplete="name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} />
          </div>
          <Button type="submit" disabled={loading} className="w-full neon-glow">
            {loading ? "Processing…" : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <button
          onClick={() => setIsRegister((v) => !v)}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {isRegister ? "Already have an account? Sign in" : "No account? Create one"}
        </button>
      </div>
    </div>
  );
}

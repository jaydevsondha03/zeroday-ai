import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
      { name: "description", content: "Sign in or create an AI-ZeroDay-Predictor account to start scanning URLs, code, and logs for zero-day vulnerabilities." },
      { property: "og:title", content: "Sign in — AI-ZeroDay-Predictor" },
      { property: "og:description", content: "Access the deterministic threat scanner and AI security analyst." },
      { property: "og:url", content: "https://zeroday-ai.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://zeroday-ai.lovable.app/auth" }],
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
  const [forgot, setForgot] = useState(false);

  async function sendReset() {
    if (!email) return toast.error("Enter your email above first");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent. Link expires in 15 minutes.");
      setForgot(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

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

        {registered ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neon-cyan/10 ring-1 ring-neon-cyan/40">
              <Shield className="h-7 w-7 text-neon-cyan" />
            </div>
            <h1 className="font-display text-2xl neon-text">Confirm your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="text-foreground">{registered}</span>.
              Click the link in that email to activate your account, then return here to sign in.
            </p>
            <p className="mt-3 text-xs text-muted-foreground/80">
              Tip: check your spam folder if it doesn't arrive within a minute.
            </p>
            <Button
              className="mt-6 w-full neon-glow"
              onClick={() => { setRegistered(null); setIsRegister(false); setPassword(""); }}
            >
              Go to sign in
            </Button>
          </div>
        ) : (
          <>
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

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                  if (r.error) toast.error(r.error.message || "Google sign-in failed");
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.2-4.8 3.2-8.2z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.4v2.8C4.2 20.5 7.8 23 12 23z"/><path fill="#FBBC05" d="M6 14.3c-.2-.7-.3-1.4-.3-2.3s.1-1.6.3-2.3V6.9H2.4C1.6 8.5 1.1 10.2 1.1 12s.5 3.5 1.3 5.1L6 14.3z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2 14.9 1 12 1 7.8 1 4.2 3.5 2.4 6.9L6 9.7c.9-2.5 3.2-4.4 6-4.4z"/></svg>
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                  if (r.error) toast.error(r.error.message || "Apple sign-in failed");
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Continue with Apple
              </Button>
            </div>


            <p className="mt-3 text-center text-xs text-muted-foreground/70">
              {isRegister
                ? "You'll get a confirmation email. Sessions stay signed in for 3 days."
                : "Your session stays active for 3 days, then you'll need to sign in again."}
            </p>

            <button
              onClick={() => setIsRegister((v) => !v)}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {isRegister ? "Already have an account? Sign in" : "No account? Create one"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

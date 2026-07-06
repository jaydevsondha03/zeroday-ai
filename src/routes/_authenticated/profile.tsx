import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/cyber/AppShell";
import { getMyProfile, updateMyProfile, deleteMyAccount } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

const profileQO = queryOptions({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });

export const Route = createFileRoute("/_authenticated/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQO),
  head: () => ({
    meta: [
      { title: "Profile — AI-ZeroDay-Predictor" },
      { name: "description", content: "Manage your account, avatar, and profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQO);
  const qc = useQueryClient();
  const router = useRouter();
  const updateFn = useServerFn(updateMyProfile);
  const deleteFn = useServerFn(deleteMyAccount);
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) return toast.error("New password must be at least 8 characters");
    if (newPw !== confirmPw) return toast.error("New passwords do not match");
    if (newPw === currentPw) return toast.error("New password must differ from current password");
    setChangingPw(true);
    try {
      if (!profile?.email) throw new Error("Missing account email");
      // Re-verify current password
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPw });
      if (verifyErr) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChangingPw(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.avatar_url) { setAvatarUrl(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 60 * 60);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  const saveMut = useMutation({
    mutationFn: (patch: { display_name?: string; avatar_url?: string | null }) => updateFn({ data: patch }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast.success("Profile updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Account deleted");
      router.navigate({ to: "/", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Max 3MB");
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${u.user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await saveMut.mutateAsync({ avatar_url: path });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onDeletePhoto() {
    if (!profile?.avatar_url) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([profile.avatar_url]);
      await saveMut.mutateAsync({ avatar_url: null });
      setAvatarUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUploading(false);
    }
  }

  const initial = (displayName || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <AppShell>
      <h1 className="font-display text-2xl sm:text-3xl">Profile</h1>
      <p className="text-sm text-muted-foreground">Manage your account.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass flex flex-col items-center p-6 lg:col-span-1">
          <Avatar className="h-28 w-28 border-2 border-neon-cyan/50">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-accent text-3xl">{initial}</AvatarFallback>
          </Avatar>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPickFile} />
          <Button className="mt-4 w-full" variant="secondary" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working</> : <><Upload className="mr-2 h-4 w-4" /> {profile?.avatar_url ? "Change photo" : "Upload photo"}</>}
          </Button>
          {profile?.avatar_url && (
            <Button className="mt-2 w-full text-neon-red hover:text-neon-red" variant="ghost" onClick={onDeletePhoto} disabled={uploading}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete photo
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground text-center">Without a photo, your initial is shown as the default avatar.</p>
        </div>


        <div className="glass p-6 lg:col-span-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} readOnly disabled />
              <p className="mt-1 text-xs text-muted-foreground">Email is managed by your account provider.</p>
            </div>
            <div>
              <Label>Member since</Label>
              <p className="mt-1 text-sm text-muted-foreground">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p>
            </div>
            <Button onClick={() => saveMut.mutate({ display_name: displayName })} disabled={saveMut.isPending} className="neon-glow">
              {saveMut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>

          <div className="mt-8 border-t border-border/40 pt-6">
            <h2 className="font-display text-lg">Change password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter your current password, then choose a new one (at least 8 characters).</p>
            <form onSubmit={changePassword} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="currentPw">Current password</Label>
                <Input id="currentPw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" required />
              </div>
              <div>
                <Label htmlFor="newPw">New password</Label>
                <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} required />
              </div>
              <div>
                <Label htmlFor="confirmPw">Confirm new password</Label>
                <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" minLength={8} required />
              </div>
              <Button type="submit" disabled={changingPw} variant="secondary">
                {changingPw ? "Updating…" : "Update password"}
              </Button>
            </form>
          </div>

          <div className="mt-8 border-t border-border/40 pt-6">
            <h2 className="font-display text-lg text-neon-red">Danger zone</h2>
            <p className="mt-1 text-sm text-muted-foreground">Permanently delete your account and all associated scans, threads, and profile data. This cannot be undone.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4"><Trash2 className="mr-2 h-4 w-4" /> Delete account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This immediately and permanently removes your account, scan history, chat threads, and profile. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMut.mutate()} className="bg-destructive hover:bg-destructive/90">
                    {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

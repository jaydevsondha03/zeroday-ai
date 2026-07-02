import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("id, email, display_name, avatar_url, created_at").eq("id", userId).maybeSingle();
    if (error) {
      console.error("getMyProfile error:", error);
      throw new Error("Unable to load profile.");
    }
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    display_name: z.string().trim().min(1).max(80).optional(),
    avatar_url: z.string().trim().max(400).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) {
      console.error("updateMyProfile error:", error);
      throw new Error("Unable to update profile.");
    }
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cascade: delete owned rows first
    await supabaseAdmin.from("predictions").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_threads").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("deleteMyAccount error:", error);
      throw new Error("Unable to delete account.");
    }
    return { ok: true };
  });

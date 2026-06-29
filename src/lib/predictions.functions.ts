import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predictThreat, type InputType } from "@/lib/predictor";
import { z } from "zod";

const AnalyzeInput = z.object({
  input_type: z.enum(["url", "code", "log"]),
  input_text: z.string().min(1).max(50_000),
});

export const analyzeThreat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const result = predictThreat(data.input_text, data.input_type as InputType);

    // Optional AI-generated human-readable explanation
    let ai_explanation: string | null = null;
    const key = process.env.LOVABLE_API_KEY;
    if (key) {
      try {
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const { generateText } = await import("ai");
        const gateway = createLovableAiGatewayProvider(key);
        const summary = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system:
            "You are a concise security analyst. Given a deterministic vulnerability scan result, write a short (120-180 word) plain-English summary covering: what the biggest risks are, why they matter, and 3 concrete remediation steps. Use markdown with a short intro paragraph and a bullet list. Do not invent findings beyond the provided ones.",
          prompt: `Input type: ${data.input_type}
Risk score: ${result.risk_score} (${result.risk_level})
Category breakdown: ${JSON.stringify(result.breakdown)}
Detected findings:
${result.vulnerabilities.map(v => `- [${v.severity}] ${v.title} — evidence: ${v.evidence}`).join("\n") || "- (none — only baseline heuristic signals)"}`,
        });
        ai_explanation = summary.text;
      } catch (err) {
        console.error("AI explanation failed:", err);
      }
    }

    const { data: row, error } = await supabase
      .from("predictions")
      .insert({
        user_id: userId,
        input_type: data.input_type,
        input_text: data.input_text,
        input_hash: result.input_hash,
        risk_score: result.risk_score,
        risk_level: result.risk_level,
        breakdown: result.breakdown as unknown as Record<string, number>,
        vulnerabilities: result.vulnerabilities as unknown as Record<string, unknown>[],
        ai_explanation,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert prediction error:", error);
      throw new Error(error.message);
    }
    return row;
  });

export const listPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deletePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("predictions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

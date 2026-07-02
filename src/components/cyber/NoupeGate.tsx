import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SRC = "https://www.noupe.com/embed/019f1761a61a7672ad719334adffb8e4e896.js";

function removeWidget() {
  document.querySelectorAll(`script[src="${SRC}"]`).forEach((s) => s.remove());
  // Best-effort cleanup of injected widget DOM
  document.querySelectorAll("[id^='noupe'], [class*='noupe'], iframe[src*='noupe']").forEach((n) => n.remove());
}

export function NoupeGate() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) { removeWidget(); return; }
    if (document.querySelector(`script[src="${SRC}"]`)) return;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    document.body.appendChild(s);
    return () => { /* keep script while authed */ };
  }, [authed]);

  return null;
}

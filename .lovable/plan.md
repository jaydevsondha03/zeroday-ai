# AI-ZeroDay-Predictor — Major Upgrade Plan

This is a large request (11 sections). To ship it well I want to confirm scope and sequencing before writing code. A few items also need your input because they can't be done silently.

---

## Phase 1 — Ship immediately (no external setup needed)

**1. Full responsiveness + mobile hamburger sidebar**
- Rebuild `AppShell` using shadcn `Sidebar` + `Sheet` so desktop keeps the fixed sidebar and mobile shows a top bar with a ☰ trigger that slides the sidebar in (matches your reference screenshots).
- Audit `dashboard`, `analyze`, `history`, `auth`, and landing pages: fix grid columns, stack cards on mobile, make charts fluid, ensure tables/forms don't overflow.

**2. Clickable logo → Home**
- Logo in `AppShell` and `auth.tsx` links to `/` (public home).

**3. Chatbot access control (Noupe widget)**
- Move the Noupe `<script>` out of `__root.tsx` and inject it only when a Supabase session exists (client-side effect in a top-level `<AuthedChatbot />` component). Signed-out users won't see the bubble anywhere.
- Note: Noupe is a third-party widget — I can hide/show the bubble, but I can't gate its internal HTTP endpoints. True API-level auth would require dropping Noupe and using the native Gemini chat we built earlier. Tell me if that matters.

**4. History → clickable full reports**
- Add route `/_authenticated/history/$id` that reloads the stored prediction (score, breakdown, vulnerabilities, AI explanation) using the same layout as `/analyze`'s result view.
- RLS already scopes `predictions` to `auth.uid()`; add an explicit ownership check server-side for defense in depth.
- Make history rows clickable; keep delete button.

**5. Profile page (basic)**
- New route `/_authenticated/profile` with: avatar (default fallback), display name, email (read-only), sign-out.
- Top-right avatar button in `AppShell` header linking to `/profile`.
- Avatar upload → new Lovable Cloud storage bucket `avatars` (public read, owner write via RLS).
- Update display name via `profiles` table.

**6. SEO polish**
- Verify every route has unique title/description/canonical/og (mostly done already).
- Add `theme-color`, `apple-touch-icon`, and a `site.webmanifest`.
- Add JSON-LD `WebPage` schema on leaf routes.
- Add `alt` attributes anywhere missing. Confirm noindex on private routes.
- Trigger a fresh SEO scan at the end and fix whatever it flags.

**7. General UI/UX pass**
- Consistent spacing tokens, touch target sizes ≥44px on mobile, focus rings, keyboard nav.

---

## Phase 2 — Needs your decisions before I build

### 8. Registration confirmation email with username + password in plain text
**I strongly recommend against this.** Sending a password in plain text over email is a well-known security anti-pattern — email is not encrypted end-to-end, sits in inboxes indefinitely, and any breach leaks credentials directly. Every serious auth provider (Google, Microsoft, Auth0, Supabase) refuses to do it. It would also fail most compliance checks (SOC2, GDPR, ISO 27001) and contradict finding-scanner rules.

**Options — pick one:**
- **A (recommended):** Custom confirmation email showing username + email + a confirmation link + a note "keep your password safe, we never store it in plain text."
- **B:** Show username + email only, no password.
- **C:** You insist on password in plain text — I'll do it but will flag it in security memory as an intentional exception.

Either way this requires setting up a custom email domain (I'll walk you through the DNS records) so we can override the default template.

### 9. Delete-account with 24h token confirmation email
Full flow: profile button → confirm dialog → server generates a signed token → email with confirmation link → link route validates token → `supabaseAdmin.auth.admin.deleteUser` + cascade delete → final "deleted" email → sign out.

Needs: custom email domain (same setup as #8), a `deletion_tokens` table, two new email templates, two new server routes.

**Confirm:** proceed with full flow, or start with just "delete immediately after in-app confirmation" (no email round-trip) and add token email later?

### 10. Social login — Google, Apple, Microsoft, GitHub, Facebook, LinkedIn
- **Google + Apple:** natively supported by Lovable Cloud. I can wire both in one turn using `lovable.auth.signInWithOAuth`. Google works out of the box; Apple works out of the box with managed credentials.
- **Microsoft, GitHub, Facebook, LinkedIn:** NOT supported by Lovable Cloud's managed auth. Adding them would require migrating auth off Lovable Cloud to a self-managed Supabase project, which is a large rewrite and loses the managed integrations.

**Recommended:** ship Google + Apple now. Skip the other four unless you're willing to migrate.

---

## Technical details (for reference)

- Sidebar: shadcn `Sidebar` component with `collapsible="offcanvas"` on mobile, `useIsMobile()` for breakpoint.
- Profile storage: new bucket `avatars`, path `{user_id}/avatar.{ext}`, public URL stored in `profiles.avatar_url`.
- History detail: reuse `AnalysisResult` component extracted from `analyze.tsx`.
- Delete tokens: `account_deletion_tokens (id uuid PK, user_id uuid, token_hash text, expires_at timestamptz, used_at timestamptz)` with RLS + `service_role` grants.
- Emails: `email_domain--setup_email_infra` → `email_domain--scaffold_transactional_email` → three templates (signup, delete-confirm, delete-done).
- Noupe gating: inject `<script>` in a `useEffect` inside a `<AuthedNoupe />` component mounted at root; on sign-out, remove the script and the injected `#noupe-*` DOM nodes.

---

## Please answer before I start

1. **Password in confirmation email** — A (link, no password), B (username+email only), or C (include password, I accept the risk)?
2. **Delete-account flow** — full 24h email token, or in-app confirm only for MVP?
3. **Social providers** — Google + Apple only (recommended), or migrate off Lovable Cloud to add Microsoft/GitHub/Facebook/LinkedIn?
4. **Chatbot** — keep Noupe (widget hidden for signed-out users, but its own endpoints aren't gated), or switch back to the native Gemini chat we built earlier (fully gated, threaded history)?
5. **Order** — ship Phase 1 first as one PR, then Phase 2 once email domain is verified? Or wait and do everything in one go?

Once you answer these I'll start Phase 1 immediately.
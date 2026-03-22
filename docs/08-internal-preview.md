# Internal Preview

## Goal

Use a stable preview URL so advisors, lab members, or collaborators can open the current web app without running `localhost`.

## Two preview modes

### 1. Demo preview

Use this when you want people to see the product shape and interaction flow before shared server data is ready.

- deploy `apps/web`
- keep `NEXT_PUBLIC_RESEARCH_OS_DATA_MODE=mock`
- set `NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE=true`
- set `NEXT_PUBLIC_RESEARCH_PAGES_DEMO_SEED_VERSION` to a simple version string
- optionally set `RESEARCH_PAGES_PREVIEW_ACCESS_KEY` for a shared access gate

What it does:

- seeds one demo account automatically
- signs the viewer into the seeded workspace
- seeds profile, affiliations, funding, documents, papers, timetable, lab data, and activity logs into browser storage
- exposes stable public demo pages for researcher and lab links

What it does not do:

- it does not create true shared data between viewers
- edits made by one reviewer do not sync to another reviewer's browser

Use this for:

- design review
- stakeholder walkthroughs
- link-based feedback rounds
- protected internal preview links

### 2. Real internal workspace

Use this when multiple people must see the same data and keep working on it.

- deploy `apps/web`
- set `NEXT_PUBLIC_RESEARCH_OS_DATA_MODE=supabase`
- configure `NEXT_PUBLIC_SUPABASE_URL`
- configure `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- apply `supabase/schema.sql`

This is the real collaboration mode:

- shared auth
- shared Postgres records
- shared Storage files
- realtime lab updates

## Recommended flow

1. Start with demo preview for UI and workflow review.
2. Move to Supabase mode when the team needs one shared source of truth.
3. Keep production private-by-default and expose public researcher or lab pages separately.

## Vercel checklist

1. Import the GitHub repository into Vercel.
2. Set the Root Directory to `apps/web`.
3. Add the required environment variables.
4. Redeploy after changing preview mode variables.
5. Open `/api/health` on the deployed URL and confirm:
   - `dataMode`
   - `demoMode`
   - `previewAccessEnabled`
   - `supabaseConfigured`
   - `demoPreviewLinks`
6. Share the generated URL with reviewers.

## Notes

- Bump `NEXT_PUBLIC_RESEARCH_PAGES_DEMO_SEED_VERSION` when you want all reviewer browsers to reseed the demo workspace.
- If `RESEARCH_PAGES_PREVIEW_ACCESS_KEY` is set, reviewers must enter that key before they can browse the deployment.
- Demo previews automatically send `X-Robots-Tag: noindex, nofollow` so internal links are not intended for indexing.
- Demo preview is intentionally web-first and lightweight. It is not a replacement for the real Supabase-backed workspace.

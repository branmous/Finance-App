# @finance-app/web

Next.js App Router project: login restricted to a single authorized email, plus the
protected welcome page. See [specs/001-cimientos](../../specs/001-cimientos/spec.md) for the
full specification and [contracts/auth.md](../../specs/001-cimientos/contracts/auth.md) for the
authorization contract this app implements.

## Local development

```sh
docker compose up -d postgres
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in AUTHORIZED_EMAIL and NEXTAUTH_SECRET
pnpm --filter @finance-app/web dev
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (local Docker, or Supabase/Neon in production). |
| `AUTHORIZED_EMAIL` | The only email allowed to sign in (normalized to lowercase, trimmed). |
| `NEXTAUTH_URL` | Public URL of the deployment (e.g. `https://your-app.vercel.app`). |
| `NEXTAUTH_SECRET` | Random secret used by Auth.js to sign session tokens. |

## Deploying to Vercel

1. Import this repository into Vercel, setting the project root to `finance-app/apps/web`
   (or configure Vercel to build from the monorepo root using the pnpm/Turborepo presets).
2. Add `DATABASE_URL`, `AUTHORIZED_EMAIL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` as environment
   variables on the Vercel project — never commit them to the repository.
3. Trigger a deploy. Once live, verify the three cases from
   [contracts/auth.md](../../specs/001-cimientos/contracts/auth.md):
   - Visiting the site without a session redirects to `/login`.
   - Signing in with any email other than `AUTHORIZED_EMAIL` ends on `/denied`, never on `/`.
   - Signing in with `AUTHORIZED_EMAIL` reaches the welcome page.

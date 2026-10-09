# @finance-app/web

Next.js App Router project: username/email + password login backed by PostgreSQL, plus the
protected welcome page. See [specs/002-login-usuario](../../specs/002-login-usuario/spec.md) for
the login specification.

## Local development

```sh
docker compose up -d postgres
pnpm install
cp apps/web/.env.example apps/web/.env   # then set NEXTAUTH_SECRET
pnpm --filter @finance-app/db migrate
pnpm --filter @finance-app/db seed-user -- --email you@example.com --username you --password "a-long-password"
pnpm --filter @finance-app/web dev
```

The seed command creates the only account. There is no public sign-up page.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (local Docker, or Supabase/Neon in production). |
| `NEXTAUTH_URL` | Public URL of the deployment (e.g. `https://your-app.vercel.app`). |
| `NEXTAUTH_SECRET` | Random secret used by Auth.js to sign session tokens. |

## Deploying to Vercel

1. Import this repository into Vercel, setting the project root to `finance-app/apps/web`
   (or configure Vercel to build from the monorepo root using the pnpm/Turborepo presets).
2. Add `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` as environment variables on the
   Vercel project — never commit them to the repository.
3. Run the migration and the seed command against the production database once, from a machine
   that has the production `DATABASE_URL`.

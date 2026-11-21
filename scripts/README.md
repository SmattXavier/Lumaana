# Setup steps (run once, in this order)

1. Copy `CLAUDE.md` to the repo root and `supabase/migrations/20261121120000_init_schema.sql` into `supabase/migrations/`.
2. Scaffold the app (the repo only has package.json so far):
   ```bash
   mv package.json package.json.bak && rm -rf node_modules package-lock.json
   npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm
   npm i -D supabase tsx dotenv
   npm i @supabase/supabase-js @supabase/ssr
   npx shadcn@latest init -d
   ```
   Then add to package.json scripts: `"seed": "tsx scripts/seed.ts"`
3. Push the schema and generate types:
   ```bash
   npx supabase db push
   npx supabase gen types typescript --linked > src/lib/database.types.ts
   ```
4. Seed the demo chain: `npm run seed`
5. Commit, push, connect the repo to Vercel, add the three env vars there.

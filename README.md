# Backpackers Backoffice

Sistema de gest&atilde;o unificada do grupo Backpackers (Adventures + Synergy + Labs).

## Stack

- **Next.js 16** (App Router, React 19.2, Turbopack default)
- **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, slate base)
- **Supabase** (Auth + Postgres + Storage)
- **Drizzle ORM** (a configurar com DATABASE_URL)
- **TanStack Query**, **Zod**, **lucide-react**

## Setup local

```bash
npm install
npm run dev
```

Aceder em `http://localhost:3000`.

## Variaveis de ambiente

Ficheiro `.env.local` (n&atilde;o committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>          # nunca expor ao cliente
DATABASE_URL=postgresql://...                          # para Drizzle (em breve)
```

## Estrutura

```
src/
  app/               # rotas (App Router)
  components/        # componentes UI + layout
    ui/              # primitivos shadcn (gerados via npx shadcn add)
  lib/
    supabase/        # clientes browser/server + proxy helper
    utils.ts         # cn() helper
  proxy.ts           # auth optimistic + session refresh (Next 16: era middleware)
```

## Padroes

- **Cookies / headers / params sao async** (Next 16). Sempre `await`.
- **Auth checks** centralizados em `src/lib/dal.ts` (a criar) com React `cache()`.
- **Multi-tenant**: todos os records sao taggeados com `pillar_id` (adventures | synergy | labs | grupo). RLS Supabase aplica permissoes.
- **Visual**: usa identidade Backpackers Labs (Trail Navy + Signal Cyan + Inter + Bebas Neue).

## Adicionar componentes shadcn

```bash
npx shadcn@latest add button input card dialog
```

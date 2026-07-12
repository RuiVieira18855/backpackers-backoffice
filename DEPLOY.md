# Outpost — Deploy Guide

## Deploy Vercel (primeira vez)

Já existe `vercel.json` no repo (cron hourly configurado). Falta ligar o projecto à conta Vercel + colar env vars.

### 1. Instalar CLI

```powershell
npm i -g vercel
```

### 2. Fazer login

```powershell
vercel login
```

Escolhe **Continue with GitHub** e autoriza — a conta Vercel deve ficar ligada ao repo `RuiVieira18855/backpackers-backoffice`.

### 3. Link e deploy inicial

Da raiz do projecto:

```powershell
cd C:\Users\ruivi\backpackers-group\backoffice
vercel
```

Perguntas típicas:

- *Set up and deploy?* → **Y**
- *Which scope?* → escolhe a tua conta pessoal
- *Link to existing project?* → **N**
- *Project name?* → `outpost` (ou `backpackers-outpost`)
- *In which directory is your code?* → `./`
- Override settings? → **N**

Termina com um URL tipo `https://outpost-xxx.vercel.app`.

### 4. Configurar env vars

No dashboard Vercel do projecto → **Settings → Environment Variables** → colar (marcar Production + Preview + Development):

| Nome | Valor | Onde encontro? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xoozhcaxhknbircxeszc.supabase.co` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | valor JWT anon | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | valor JWT service | `.env.local` |
| `DATABASE_URL` | `postgresql://postgres.xoozhcaxhknbircxeszc:…@aws-0-eu-west-1.pooler.supabase.com:6543/postgres` | `.env.local` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | `.env.local` |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | chave AES base64 | `.env.local` |
| `CRON_SECRET` | gerar novo (para autenticar Vercel Cron) | `openssl rand -hex 32` |
| `RESEND_API_KEY` | opcional (email transaccional) | Resend dashboard |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | opcional (OAuth calendar) | Google Cloud Console |
| `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` | opcional (OAuth calendar) | Azure Portal |

Depois de colar → clicar **Redeploy** no último deployment para pegar as env vars.

### 5. Domínio custom (opcional)

No dashboard Vercel → **Settings → Domains** → adicionar `outpost.backpackers.com` (ou similar). Vercel dá as instruções DNS (CNAME).

### 6. Deploys automáticos

Vercel liga-se ao repo GitHub. Cada `git push origin main` faz deploy automático em ~2 min.

Para preview branches: `git push origin feature/x` → cria deploy preview num URL único.

---

## Instalar como app (PWA)

Depois de ter o URL público (localhost ou vercel), no Chrome/Edge:

1. Abrir o URL (`localhost:3000` ou `outpost-xxx.vercel.app`)
2. Barra de endereço → ícone ⊕ (Install this site as an app) OU menu ⋮ → **Instalar Outpost**
3. Abre em janela dedicada sem barra Chrome, com ícone Trail Navy no ambiente de trabalho
4. Aparece também no Menu Iniciar do Windows

O PWA usa o `manifest.ts` deste projecto — start_url `/dashboard`, tema Trail Navy `#0E2A44`.

---

## Custos estimados Vercel

- **Free tier (Hobby):** 100GB bandwidth/mês, 1000 execuções de serverless/dia, 1 cron. **Suficiente para uso interno da equipa.**
- **Pro ($20/mês):** 1TB bandwidth, crons ilimitados, colaboradores, analytics. **Só se venderes o Outpost para vários clientes ou tiveres tráfego alto.**

Ficas no Free enquanto o Outpost for interno.

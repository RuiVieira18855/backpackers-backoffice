# Integrar uma app com o Backoffice Backpackers

Este documento é o passo-a-passo para plugar qualquer app Backpackers
(existente ou nova) ao sistema de acessos partilhado. Alvo típico: uma SaaS
externa (Cairn Pro, e futuras) que quer:

- validar que o utilizador comprou/tem acesso antes de o deixar entrar,
- criar novos utilizadores como "clientes" (nunca como equipa),
- mostrar o plano actual num painel de definições.

Tudo assenta no mesmo projecto Supabase que o backoffice usa. Não há um
API HTTP separado — a app fala directamente com o Supabase, e a RLS + as
funções `has_app_access` / `handle_new_user` fazem o resto.

---

## 0. Pré-requisitos (uma vez no backoffice)

Correr no SQL Editor do Supabase, por ordem:

1. `supabase/14_app_access.sql` — tabela de entitlements + RLS.
2. `supabase/15_apps_multi.sql` — catálogo de apps + `profiles.kind`.
3. `supabase/16_signup_kind.sql` — trigger que interpreta `kind` + `app_key`.
4. `supabase/17_super_user_universal_access.sql` — super_users com acesso a tudo.

Já feitos → nada a fazer aqui de novo.

---

## 1. Registar a app no catálogo

Vai a **/admin/apps** no backoffice → secção "Adicionar app ao catálogo":

| Campo | Exemplo | Notas |
|-------|---------|-------|
| Chave | `cairn` | minúsculas, `[a-z0-9_-]`. É o identificador estável. Não muda. |
| Nome | `Cairn Pro` | Aparece na UI do backoffice. |
| Ícone | `Map` | Nome de um ícone do lucide-react. Opcional. |
| Descrição | `Diagramas + AI…` | Livre. |
| URL pública | `https://cairn.backpackers…` | Onde a app vive em produção. |

A partir daqui a app existe. Podes já conceder acessos manuais em
`/admin/apps/[chave]` — mas o mais comum é que a app faça self-signup
(passo 3) e um admin só interfira em casos especiais.

---

## 2. Instalar o SDK na app

Copiar o ficheiro [`sdk/backpackers-access.ts`](./sdk/backpackers-access.ts)
para `src/lib/` da app-alvo. É um único ficheiro, TS puro, sem
dependências além de `@supabase/supabase-js`.

Não é publicado como package — é intencionalmente copy-paste para cada
app escolher a versão que quer congelar. Se corrigirmos um bug aqui,
propagamos manualmente aos consumers.

---

## 3. Signup de cliente (na app)

Onde a app tem hoje `supabase.auth.signUp(...)`, substituir por:

```ts
import { signupCustomer } from "@/lib/backpackers-access";

const { data, error } = await signupCustomer(supabase, {
  email,
  password,
  fullName,
  appKey: "cairn", // a chave que registaste no passo 1
});
```

O trigger `handle_new_user` (SQL 16) faz automaticamente:

- cria a linha em `profiles` com `kind = 'customer'`,
- garante que este utilizador nunca vira super_user, nunca ganha skills
  de backoffice,
- cria uma linha em `app_access` com `status = 'trial'` (plan
  `self-signup`) — o cliente entra logo em trial.

---

## 4. Guardar o login (na app)

Depois de `signInWithPassword` bem sucedido:

```ts
import { guardLogin } from "@/lib/backpackers-access";

const ok = await guardLogin(supabase, "cairn");
if (!ok) {
  // O SDK já deu sign-out. Mostra ao user "Sem acesso — contacta suporte".
  showNoAccessScreen();
  return;
}
router.push("/app");
```

`hasAccess` (que `guardLogin` chama internamente) devolve `true` para:

- **super_users do backoffice** — automaticamente, sempre.
- **customers** com `status IN ('trial', 'active')` e não expirado.

Devolve `false` para todos os outros — expirados, revogados, sem linha.

---

## 5. Mostrar plano actual (na app)

Ex.: numa página de definições da app:

```ts
import { getEntitlement } from "@/lib/backpackers-access";

const ent = await getEntitlement(supabase, "cairn");
if (ent) {
  // ent.status, ent.plan, ent.expiresAt, ent.active
}
```

Nota: super_users **não têm** linha em `app_access` — `getEntitlement`
devolve `null` para eles. Se a app precisa distinguir "sem acesso" vs
"super_user com acesso automático", combina com `hasAccess()`:

```ts
const [ent, ok] = await Promise.all([
  getEntitlement(supabase, "cairn"),
  hasAccess(supabase, "cairn"),
]);
if (!ok) return blockUi();
if (!ent) return renderSuperUserBanner(); // Super_user: acesso premium
renderPlan(ent);
```

---

## 6. Gerir manualmente (no backoffice)

Ir a `/admin/apps/[chave]`:

- **Filtro "Tipo"**: Todos / Equipa / Clientes.
- Cada linha: mudar status (`none` para revogar), plan (texto livre), expiry
  (data). "Guardar" faz upsert / delete.
- Super_users aparecem com badge "Auto" — não precisas mexer, é derivado.
- Auditoria: cada mudança escreve em `audit_log` (visível no dashboard).

---

## Nada acontece ao adicionar uma app 2ª/3ª/N-ésima

Design intencional: a app só precisa do SDK + registar a chave. Zero
mudanças ao backoffice. Zero rows manuais para super_users. Zero API
proprietária a manter.

Se aparecer um requisito específico (ex.: planos diferenciados,
funcionalidades por skill, integração com um AI proxy próprio), abre-se
um turno de extensão pontual.

---

# Integrações externas (opcionais)

## Google Calendar sync

**Setup uma vez:**

1. Vai a https://console.cloud.google.com/apis/credentials → cria um
   projecto → **Create Credentials → OAuth client ID** (Web application).
2. **Authorized redirect URIs**: adiciona
   `https://<TEU-URL-BACKOFFICE>/api/oauth/google/callback` (produção) e
   `http://localhost:3000/api/oauth/google/callback` (dev).
3. Copia Client ID + Client Secret.
4. Enable the API: https://console.cloud.google.com/apis/library → procura
   "Google Calendar API" → Enable.
5. Vercel → Environment Variables:
   ```
   GOOGLE_CLIENT_ID=…
   GOOGLE_CLIENT_SECRET=…
   GOOGLE_REDIRECT_URI=https://<TEU-URL-BACKOFFICE>/api/oauth/google/callback
   ```
6. Redeploy.

**Cada utilizador (self-service):**

- Vai a `/settings` → card "Sync de calendário" → clica **Ligar** ao lado
  do Google Calendar. Confirma no ecrã Google → volta ao backoffice.
- Escolhe o **pilar de destino** (onde os eventos importados vão parar).
- Clica **Sincronizar agora**. Puxa eventos dos últimos 7 dias até 90 dias
  no futuro. Upsert idempotente por `google_event_id`.
- Sync é one-way (Google → Backpackers). Edições locais nunca são
  sobrepostas — só os campos vazios em eventos existentes são preenchidos.

**Scope pedido:** `calendar.readonly` (não modifica nada em Google).

## Outlook / Microsoft 365 calendar sync

**Setup uma vez:**

1. Vai a https://portal.azure.com → Azure Active Directory → App
   registrations → **New registration**.
2. **Redirect URI (Web)**:
   `https://<TEU-URL-BACKOFFICE>/api/oauth/microsoft/callback`.
3. Copia Application (client) ID.
4. Certificates & secrets → **New client secret** → copia o value.
5. API permissions → Add → Microsoft Graph → **Delegated** →
   `Calendars.Read`, `offline_access`, `openid`, `email`, `profile`.
   Grant admin consent.
6. Vercel → Environment Variables:
   ```
   MICROSOFT_CLIENT_ID=…
   MICROSOFT_CLIENT_SECRET=…
   MICROSOFT_REDIRECT_URI=https://<TEU-URL-BACKOFFICE>/api/oauth/microsoft/callback
   MICROSOFT_TENANT=common
   ```
   (Usa `common` para multi-tenant. Se for single-tenant, mete o teu
   tenant id no lugar.)
7. Redeploy.

**Uso é idêntico ao Google** — botão **Ligar** ao lado do Outlook em
`/settings`.

## Push sync (backpackers → external)

**Também activo.** Quando um utilizador com conexão Google/Outlook cria,
edita ou apaga um evento no backoffice em que é `ownerId`, a alteração
é replicada para o calendário externo dessa pessoa:

- **Create local** → cria no Google/Outlook, guarda o external id de volta
  em `events.google_event_id` / `events.microsoft_event_id`.
- **Update local** → PATCH ao external usando o id guardado.
- **Delete local** → DELETE ao external (410/404 são ignorados).

Best-effort: falhas de push só logam, o commit local nunca é revertido.

**Nota importante sobre scopes**: se ligaste o Google/Outlook ANTES desta
actualização, tens de **Desligar + Ligar de novo** em `/settings` porque
os scopes mudaram de leitura para leitura+escrita.

## Auto-sync agendado (Vercel Cron)

`vercel.json` regista `/api/cron/hourly` para correr **de hora a hora**.
Faz três coisas por chamada:

1. Puxa eventos externos para cada conexão que tenha `default_pillar_id`
   definido (idêntico ao botão "Sincronizar agora").
2. Fires `task.due_soon` para tarefas com `due_date IN (hoje, amanhã)` e
   `status != done` → workflows correm as suas acções.
3. Fires `transaction.overdue` para transacções `pending` com
   `due_date < hoje` → workflows.

**Setup:**

1. Vercel → Settings → **Environment Variables** → adiciona
   `CRON_SECRET=<gera-um-token-forte>` (32+ chars).
2. Redeploy. O Vercel Cron começa a chamar automaticamente.
3. Podes testar manualmente:
   ```
   curl -H "Authorization: Bearer <o-teu-CRON_SECRET>" \
        https://<TEU-BACKOFFICE>/api/cron/hourly
   ```
   Devolve JSON com o report da execução.

Sem `CRON_SECRET`, o endpoint responde 401 a qualquer request.

## Ficou de fora (sprints próprios)

- **Múltiplas contas por utilizador por provider** — actualmente 1
  conexão por (user, provider). Refactor médio, valor discutível.
- **Two-way conflict resolution avançado** — hoje é last-write-wins
  simples: pull não sobrepõe campos não-nulos; push só corre em
  edições feitas no backoffice. Basta para 90% dos casos.

---

# Email transaccional (Resend)

**Setup uma vez:**

1. Cria conta em https://resend.com (free tier: 3000 emails/mês,
   100/dia).
2. **API Keys** → cria uma → copia (`re_xxxxxxxxxxxx`).
3. (Opcional, mas recomendado para produção): **Domains** → adiciona o
   teu domínio → configura os DNS records (DKIM + SPF). Sem isto, só
   podes enviar para o email da conta Resend.
4. Vercel → Environment Variables:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=Backpackers <noreply@your-domain.com>
   ```
   Sem `RESEND_FROM_EMAIL` o helper usa `onboarding@resend.dev` (só
   entrega ao email da conta Resend).
5. Redeploy.

**Validar:** `/admin/resend-test` → mete o teu email → **Enviar**. Se
receberes, está a funcionar.

**Onde é usado:**
- Confirmação automática do `/book` (público) para o lead.
- Acção `send_email` nos workflows (`/admin/workflows`).
- Futuras integrações (recovery, notificações, relatórios agendados).

Se `RESEND_API_KEY` não estiver definido, todos os pontos acima ficam em
no-op silencioso — o resto da app funciona na mesma.

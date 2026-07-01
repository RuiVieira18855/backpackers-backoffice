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

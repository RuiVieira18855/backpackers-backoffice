/**
 * Backpackers Labs — App switcher (shell partilhado) — v1
 * =============================================================================
 * Fonte de verdade. Copiar verbatim para cada app (o Cairn tem-no em
 * app/src/components/AppSwitcher.jsx). Não divergir.
 *
 * O que faz: um botão de grelha que abre a lista de tools Labs que esta pessoa
 * pode abrir, marcando a actual e explicando quando o acesso vem do Labs Pass.
 * Quem não tem passe vê no fundo o convite para o comprar.
 *
 * Regras que este componente respeita:
 *  - Carrega a lista só quando alguém abre o menu (nada de RPC no arranque).
 *  - Se a migração do passe ainda não correu, ou se a pessoa só tem esta tool,
 *    não se desenha de todo. Um selector com uma opção é ruído.
 *  - Em modo white-label o pai não o deve renderizar (um cliente com marca
 *    própria não quer o menu da Backpackers dentro do produto dele).
 *
 * Depende de labs-apps.ts. React sem mais dependências.
 * =============================================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { listMyApps, hasLabsPass, withIdentity } from "../lib/labs-apps";

export default function AppSwitcher({
  supabase,
  /** Chave desta app no catálogo, ex. "cairn". */
  currentApp,
  /** Stripe Payment Link do Labs Pass. Sem isto, não se mostra o upsell. */
  passUrl = "",
  session = null,
  /** Rótulos, para a app poder traduzir. */
  labels = {},
}) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState(null); // null = ainda não carregou
  const [pass, setPass] = useState(false);
  const ref = useRef(null);

  const L = {
    title: "Backpackers Labs",
    current: "aqui",
    viaPass: "no teu Labs Pass",
    getPass: "Labs Pass: todas as tools numa subscrição",
    ...labels,
  };

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Carrega à primeira abertura.
  useEffect(() => {
    if (!open || apps !== null || !supabase) return;
    let alive = true;
    (async () => {
      const [list, hasPass] = await Promise.all([
        listMyApps(supabase),
        hasLabsPass(supabase),
      ]);
      if (!alive) return;
      setApps(list);
      setPass(hasPass);
    })();
    return () => { alive = false; };
  }, [open, apps, supabase]);

  // Sem sessão não há nada para mostrar.
  if (!session) return null;

  const others = (apps || []).filter((a) => a.key !== currentApp && a.url);
  const checkout = withIdentity(passUrl, session?.user?.id, session?.user?.email);

  return (
    <div className="menu app-switcher" ref={ref} style={{ position: "relative" }}>
      <button
        className="ghost"
        title={L.title}
        aria-label={L.title}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "grid", placeItems: "center" }}
      >
        <GridIcon />
      </button>

      {open && (
        <div className="menu-pop right" style={{ minWidth: 250 }}>
          <div className="menu-cap sub" style={{ padding: "2px 10px 7px" }}>{L.title}</div>

          {apps === null ? (
            <div className="sub" style={{ padding: "6px 10px", opacity: 0.7 }}>…</div>
          ) : (
            <>
              {(apps || []).map((a) => {
                const isCurrent = a.key === currentApp;
                const note = isCurrent ? L.current : a.source === "pass" ? L.viaPass : "";
                const inner = (
                  <>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Dot color={a.color} />
                      {a.name}
                    </span>
                    {note ? <span className="sub" style={{ fontSize: 11 }}>{note}</span> : null}
                  </>
                );
                const row = {
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, width: "100%", textDecoration: "none",
                };
                // A app actual não é um link: já lá estamos.
                return isCurrent || !a.url ? (
                  <button key={a.key} disabled style={{ ...row, opacity: 0.65, cursor: "default" }}>{inner}</button>
                ) : (
                  <a key={a.key} href={a.url} style={row}>{inner}</a>
                );
              })}

              {others.length === 0 && apps.length <= 1 ? (
                <div className="sub" style={{ padding: "4px 10px 8px", fontSize: 11.5, lineHeight: 1.5, opacity: 0.8 }}>
                  Mais tools a caminho.
                </div>
              ) : null}

              {!pass && checkout ? (
                <>
                  <hr />
                  <a href={checkout} target="_blank" rel="noreferrer"
                    style={{ display: "block", textDecoration: "none", fontSize: 12.5, lineHeight: 1.45 }}>
                    {L.getPass}
                  </a>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
      <circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    </svg>
  );
}

function Dot({ color }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
      background: color || "currentColor", opacity: color ? 1 : 0.45,
    }} />
  );
}

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#FAFAFA",
          color: "#0E2A44",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Algo correu mal</h1>
          <p style={{ color: "#475569", marginBottom: 16 }}>
            Ocorreu um erro inesperado. Os detalhes técnicos estão abaixo —
            partilhe-os com o suporte se o problema persistir.
          </p>
          <pre
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 240,
              overflow: "auto",
            }}
          >
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "#0E2A44",
              color: "#FAFAFA",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}

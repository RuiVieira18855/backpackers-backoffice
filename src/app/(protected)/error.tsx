"use client";

import Link from "next/link";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            Erro
          </p>
          <h1 className="font-display text-4xl text-foreground leading-none mt-1">
            Algo correu mal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta página não conseguiu ser carregada. Detalhes técnicos abaixo.
          </p>
        </div>
        <pre className="text-xs bg-card border border-border rounded-md p-3 whitespace-pre-wrap break-words max-h-60 overflow-auto">
          {error.message}
          {error.digest ? `\n\nDigest: ${error.digest}` : ""}
        </pre>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90"
          >
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

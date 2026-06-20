export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <p className="font-display text-6xl sm:text-7xl text-foreground leading-none">
          Backpackers <span className="text-accent-foreground bg-accent px-2">Backoffice</span>
        </p>
        <p className="mt-6 text-base sm:text-lg text-muted-foreground">
          Sistema unificado de gest&atilde;o do grupo Backpackers.
          Adventures, Synergy &amp; Labs.
        </p>
        <p className="mt-10 text-sm text-muted-foreground">
          v0.0.1 &middot; foundations &middot; Next.js 16 + Supabase
        </p>
      </div>
    </main>
  );
}

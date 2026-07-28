"use client";

// The app card is wrapped in a <Link>; this external URL link stops click
// propagation so opening the URL does not also navigate the card. The onClick
// must live in a Client Component (Server Components can't pass event handlers).
export function AppUrl({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline truncate"
    >
      {url}
    </a>
  );
}

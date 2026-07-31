import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BlogRows } from "./rows";

const PILLAR_LABELS: Record<string, string> = {
  bwa: "🎒 Backpackers",
  adventures: "🌿 Adventures",
  synergy: "🏢 Synergy",
  labs: "💡 Labs",
};

export default async function AdminBlogPage() {
  await requireRole("admin_grupo");

  const rows = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      pillar: blogPosts.pillar,
      category: blogPosts.category,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      updatedAt: blogPosts.updatedAt,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao admin
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
              Blog
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Escreve e publica os artigos do site. Publicar atualiza o site
              automaticamente.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/blog/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo post
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Ainda não há posts"
          description="Cria o teu primeiro artigo do blog."
          action={{ label: "Novo post", href: "/admin/blog/new" }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <BlogRows rows={rows} pillarLabels={PILLAR_LABELS} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

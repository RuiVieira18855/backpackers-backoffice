import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { BlogPostForm } from "../blog-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  await requireRole("admin_grupo");
  const { id } = await params;

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
  });
  if (!post) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/blog">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao blog
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          {post.slug}
        </p>
      </div>
      <BlogPostForm
        post={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          pillar: post.pillar,
          category: post.category,
          author: post.author,
          coverImage: post.coverImage,
          status: post.status,
        }}
      />
    </div>
  );
}

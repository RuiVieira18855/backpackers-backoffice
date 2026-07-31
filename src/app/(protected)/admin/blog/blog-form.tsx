"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBlogPost, updateBlogPost, type BlogState } from "./actions";

export type BlogPostFormValues = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  pillar: "bwa" | "adventures" | "synergy" | "labs";
  category: string;
  author: string;
  coverImage: string | null;
  status: "draft" | "published";
};

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";

export function BlogPostForm({ post }: { post?: BlogPostFormValues }) {
  const isEdit = Boolean(post?.id);
  const action = isEdit
    ? updateBlogPost.bind(null, post!.id!)
    : createBlogPost;

  const [state, formAction, pending] = useActionState<
    BlogState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={post?.title ?? ""}
              placeholder="Caminhos de Santiago: o que levar na mochila"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug (link do post)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={post?.slug ?? ""}
              placeholder="caminhos-de-santiago-o-que-levar"
              aria-invalid={Boolean(state?.fieldErrors?.slug)}
            />
            <p className="text-xs text-muted-foreground">
              Deixa vazio para gerar automaticamente a partir do título. Fica em
              backpackersworldadventures.com/blog/o-teu-slug
            </p>
            {state?.fieldErrors?.slug && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.slug}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="pillar">Pilar</Label>
              <select
                id="pillar"
                name="pillar"
                defaultValue={post?.pillar ?? "bwa"}
                className={selectClass}
              >
                <option value="bwa">🎒 Backpackers</option>
                <option value="adventures">🌿 Adventures</option>
                <option value="synergy">🏢 Synergy</option>
                <option value="labs">💡 Labs</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                name="category"
                defaultValue={post?.category ?? ""}
                placeholder="Guias, Casos, Trilhos..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                name="status"
                defaultValue={post?.status ?? "draft"}
                className={selectClass}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="author">Autor</Label>
            <Input
              id="author"
              name="author"
              defaultValue={post?.author ?? "Backpackers World Adventures"}
              placeholder="Rui Vieira"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="excerpt">Resumo (aparece na lista e na partilha)</Label>
            <textarea
              id="excerpt"
              name="excerpt"
              defaultValue={post?.excerpt ?? ""}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
              placeholder="Uma ou duas frases que descrevem o post."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="coverFile">Imagem de capa</Label>
            {post?.coverImage && (
              <div className="h-40 w-full max-w-md overflow-hidden rounded-md border border-input">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt="Capa atual"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input type="hidden" name="coverImage" value={post?.coverImage ?? ""} />
            <input
              id="coverFile"
              name="coverFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP ou AVIF, até 4MB.{" "}
              {post?.coverImage
                ? "Escolhe um ficheiro só se quiseres substituir a capa atual."
                : ""}
            </p>
            {state?.fieldErrors?.coverFile && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.coverFile}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <Label htmlFor="content">Conteúdo (Markdown)</Label>
          <p className="text-xs text-muted-foreground">
            Escreve em Markdown: # Título, ## Subtítulo, **negrito**, listas com -,
            links [texto](url) e imagens ![alt](url).
          </p>
          <textarea
            id="content"
            name="content"
            defaultValue={post?.content ?? ""}
            rows={22}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
            placeholder={"## Introdução\n\nO teu texto aqui...\n\n## Conclusão\n..."}
          />
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

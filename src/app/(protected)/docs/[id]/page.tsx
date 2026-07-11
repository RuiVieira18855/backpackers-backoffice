import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, ExternalLink, FileText } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { DeleteDocumentButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default async function DocumentDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("docs.detail");
  const tTypes = await getTranslations("docs.types");

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { pillar: true, uploadedByProfile: true },
  });

  if (!doc) notFound();

  // 10 minute signed URL — generated on each page load so links don't leak.
  const { data: signed } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storagePath, 600);
  const url = signed?.signedUrl;

  const isImage = doc.mimeType?.startsWith("image/") ?? false;
  const isPdf = doc.mimeType === "application/pdf";
  const isVideo = doc.mimeType?.startsWith("video/") ?? false;
  const canInline = isImage || isPdf || isVideo;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/docs">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {doc.title}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {doc.pillar?.name ?? ""} · {tTypes(doc.type)}
            </p>
          </div>
          <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
        </div>
      </div>

      {doc.description && (
        <p className="text-base text-foreground whitespace-pre-wrap">
          {doc.description}
        </p>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <FileText className="h-10 w-10 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground break-all">
                {doc.fileName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatBytes(doc.fileSize)}
                {doc.mimeType ? ` · ${doc.mimeType}` : ""}
              </p>
              {doc.uploadedByProfile && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("uploadedBy", {
                    name:
                      doc.uploadedByProfile.fullName ??
                      doc.uploadedByProfile.email,
                    date: new Intl.DateTimeFormat("pt-PT", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(doc.createdAt),
                  })}
                </p>
              )}
            </div>
            {url && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("open")}
                  </a>
                </Button>
                <Button asChild>
                  <a href={url} download={doc.fileName}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download")}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inline preview for supported types */}
      {canInline && url && (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={doc.title}
                className="w-full max-h-[80vh] object-contain bg-muted/30"
              />
            )}
            {isPdf && (
              <iframe
                src={url}
                title={doc.title}
                className="w-full h-[80vh] bg-muted/30"
              />
            )}
            {isVideo && (
              <video
                src={url}
                controls
                className="w-full max-h-[80vh] bg-black"
              >
                Browser não suporta vídeo HTML5.
              </video>
            )}
          </CardContent>
        </Card>
      )}

      {!canInline && (
        <p className="text-sm text-muted-foreground italic">
          {t("noPreview")}
        </p>
      )}
    </div>
  );
}

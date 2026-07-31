"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdventure,
  updateAdventure,
  type AdventureState,
} from "./actions";
import { DIFFICULTY_LABELS, EVENT_TYPE_LABELS, SITE_REGIONS } from "./regions";

export type AdventureFormValues = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  /** Já convertido para hora de Lisboa, no formato do input datetime-local. */
  startsAtLocal: string;
  endsAtLocal: string;
  plannedMonth: string;
  type: "adventure" | "synergy-open" | "workshop" | "retreat";
  location: string;
  region: string;
  lat: string;
  lng: string;
  meetingPoint: string;
  distance: string;
  difficulty: string;
  price: string;
  maxParticipants: string;
  coverImage: string | null;
  images: string[];
  included: string[];
  requirements: string[];
  featured: boolean;
  status: "draft" | "published" | "archived";
};

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";
const textareaClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed";

export function AdventureForm({ event }: { event?: AdventureFormValues }) {
  const isEdit = Boolean(event?.id);
  const action = isEdit
    ? updateAdventure.bind(null, event!.id!)
    : createAdventure;

  const [state, formAction, pending] = useActionState<
    AdventureState | undefined,
    FormData
  >(action, undefined);

  // Controlado só para poder esconder o "mês previsto" quando há data certa.
  const [startsAt, setStartsAt] = useState(event?.startsAtLocal ?? "");
  const dateConfirmed = startsAt.trim().length > 0;

  return (
    <form action={formAction} className="space-y-6">
      {/* Identificação */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={event?.title ?? ""}
              placeholder="PR4 · Trilho da Fórnea"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug (link da caminhada)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={event?.slug ?? ""}
              placeholder="pr4-fornea"
              aria-invalid={Boolean(state?.fieldErrors?.slug)}
            />
            <p className="text-xs text-muted-foreground">
              Deixa vazio para gerar a partir do título. Fica em
              backpackersworldadventures.com/eventos/o-teu-slug
            </p>
            {state?.fieldErrors?.slug && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.slug}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                defaultValue={event?.type ?? "adventure"}
                className={selectClass}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                name="status"
                defaultValue={event?.status ?? "draft"}
                className={selectClass}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Arquivado sai da agenda e do mapa, mas a página continua a
                abrir.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="featured">Destaque</Label>
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  id="featured"
                  name="featured"
                  type="checkbox"
                  defaultChecked={event?.featured ?? false}
                  className="h-4 w-4"
                />
                Marcar como destaque
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary">Resumo (aparece na lista e na partilha)</Label>
            <textarea
              id="summary"
              name="summary"
              defaultValue={event?.summary ?? ""}
              rows={2}
              className={textareaClass}
              placeholder="Uma ou duas frases que descrevem a caminhada."
            />
          </div>
        </CardContent>
      </Card>

      {/* Quando */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quando
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="startsAt">Início (hora de Portugal)</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixa vazio se a data ainda está por confirmar.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endsAt">Fim (opcional)</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={event?.endsAtLocal ?? ""}
                disabled={!dateConfirmed}
              />
            </div>
          </div>

          {!dateConfirmed && (
            <div className="grid gap-2">
              <Label htmlFor="plannedMonth">Mês previsto</Label>
              <Input
                id="plannedMonth"
                name="plannedMonth"
                type="month"
                defaultValue={event?.plannedMonth ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                O site mostra &quot;Outubro 2026 · a confirmar&quot;.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onde */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Onde
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                name="location"
                defaultValue={event?.location ?? ""}
                placeholder="Serra de Aire, Alvados"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Região (marcador no mapa)</Label>
              <select
                id="region"
                name="region"
                defaultValue={event?.region ?? ""}
                className={selectClass}
              >
                <option value="">Sem região</option>
                {SITE_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                name="lat"
                inputMode="decimal"
                defaultValue={event?.lat ?? ""}
                placeholder="39.5417"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                name="lng"
                inputMode="decimal"
                defaultValue={event?.lng ?? ""}
                placeholder="-8.7789"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Coordenadas colocam o marcador no mapa interactivo. Tira-as do
            Google Maps: botão direito no ponto, primeiro valor é a latitude.
          </p>

          <div className="grid gap-2">
            <Label htmlFor="meetingPoint">Ponto de encontro</Label>
            <textarea
              id="meetingPoint"
              name="meetingPoint"
              defaultValue={event?.meetingPoint ?? ""}
              rows={2}
              className={textareaClass}
              placeholder="Centro de Interpretação Ambiental de Alvados, 9h."
            />
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do trilho */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Trilho e inscrição
          </h2>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="distance">Distância</Label>
              <Input
                id="distance"
                name="distance"
                defaultValue={event?.distance ?? ""}
                placeholder="9,5 km"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Dificuldade</Label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={event?.difficulty ?? ""}
                className={selectClass}
              >
                <option value="">Sem grau</option>
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Preço (€)</Label>
              <Input
                id="price"
                name="price"
                inputMode="numeric"
                defaultValue={event?.price ?? "0"}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">0 = grátis</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxParticipants">Vagas</Label>
              <Input
                id="maxParticipants"
                name="maxParticipants"
                inputMode="numeric"
                defaultValue={event?.maxParticipants ?? "0"}
                placeholder="20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="included">Está incluído (um por linha)</Label>
              <textarea
                id="included"
                name="included"
                defaultValue={(event?.included ?? []).join("\n")}
                rows={7}
                className={textareaClass}
                placeholder={"Guia experiente da Backpackers\nSeguro de acidente pessoal\nLanche no fim"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requirements">Traz contigo (um por linha)</Label>
              <textarea
                id="requirements"
                name="requirements"
                defaultValue={(event?.requirements ?? []).join("\n")}
                rows={7}
                className={textareaClass}
                placeholder={"Botas de trilho\nMochila pequena com água\nChapéu"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imagens */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Imagens
          </h2>

          <div className="grid gap-2">
            <Label htmlFor="coverFile">Imagem de capa</Label>
            {event?.coverImage && (
              <div className="h-40 w-full max-w-md overflow-hidden rounded-md border border-input">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.coverImage}
                  alt="Capa atual"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input
              type="hidden"
              name="coverImage"
              value={event?.coverImage ?? ""}
            />
            <input
              id="coverFile"
              name="coverFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP ou AVIF, até 4MB.{" "}
              {event?.coverImage
                ? "Escolhe um ficheiro só se quiseres substituir a capa atual."
                : ""}
            </p>
            {state?.fieldErrors?.coverFile && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.coverFile}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="galleryFiles">Adicionar à galeria</Label>
            <input
              id="galleryFiles"
              name="galleryFiles"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              As fotos novas juntam-se às da lista abaixo. Somadas não podem
              passar de 4MB por gravação.
            </p>
            {state?.fieldErrors?.galleryFiles && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.galleryFiles}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="images">Galeria (um endereço por linha)</Label>
            <textarea
              id="images"
              name="images"
              defaultValue={(event?.images ?? []).join("\n")}
              rows={5}
              className={`${textareaClass} font-mono text-xs`}
              placeholder="/images/events/team-outdoor.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Apaga uma linha para tirar a foto da galeria, ou troca a ordem das
              linhas para reordenar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Descrição longa */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <Label htmlFor="description">Descrição completa</Label>
          <p className="text-xs text-muted-foreground">
            Texto corrido. As quebras de linha são respeitadas no site.
          </p>
          <textarea
            id="description"
            name="description"
            defaultValue={event?.description ?? ""}
            rows={16}
            className={textareaClass}
            placeholder={"O que é esta caminhada, o que se vê, para quem é...\n\nSegundo parágrafo."}
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

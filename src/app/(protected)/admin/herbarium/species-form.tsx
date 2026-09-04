"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSpecies, updateSpecies, type SpeciesState } from "./actions";
import {
  DANGER_LABELS,
  HABITAT_LABELS,
  HERBARIUM_HABITATS,
  HERBARIUM_STATUSES,
  HERBARIUM_TAGS,
  STATUS_LABELS,
  TAG_LABELS,
} from "./constants";

export type SpeciesFormValues = {
  slug: string;
  scientificName: string;
  family: string;
  namePt: string;
  nameEn: string;
  nameEs: string;
  akaPt: string;
  akaEn: string;
  akaEs: string;
  habitat: string[];
  monthsFlower: string;
  monthsFruit: string;
  tags: string[];
  danger: number;
  summaryPt: string;
  summaryEn: string;
  summaryEs: string;
  fieldMarksPt: string;
  fieldMarksEn: string;
  fieldMarksEs: string;
  usesPt: string;
  usesEn: string;
  usesEs: string;
  legalNotePt: string;
  legalNoteEn: string;
  legalNoteEs: string;
  lookalikes: string;
  images: string;
  sources: string;
  status: string;
};

const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
const areaClass =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const monoClass =
  "min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs";

function Trio({
  name,
  label,
  hint,
  values,
  rows = "area",
}: {
  name: string;
  label: string;
  hint?: string;
  values: { pt: string; en: string; es: string };
  rows?: "area" | "input";
}) {
  const Cap = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {(["pt", "en", "es"] as const).map((l) => (
        <div key={l} className="grid gap-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">{l}</span>
          {rows === "input" ? (
            <Input name={`${name}${l === "pt" ? "Pt" : l === "en" ? "En" : "Es"}`} defaultValue={values[l]} />
          ) : (
            <textarea
              name={`${name}${l === "pt" ? "Pt" : l === "en" ? "En" : "Es"}`}
              defaultValue={values[l]}
              className={areaClass}
              aria-label={`${Cap} ${l}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function SpeciesForm({ species }: { species?: SpeciesFormValues }) {
  const isEdit = Boolean(species?.slug);
  const action = isEdit ? updateSpecies.bind(null, species!.slug) : createSpecies;
  const [state, formAction, pending] = useActionState<SpeciesState | undefined, FormData>(
    action,
    undefined,
  );
  const v = species;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Identidade */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scientificName">Nome científico</Label>
              <Input
                id="scientificName"
                name="scientificName"
                required
                defaultValue={v?.scientificName ?? ""}
                placeholder="Foeniculum vulgare"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="family">Família</Label>
              <Input
                id="family"
                name="family"
                required
                defaultValue={v?.family ?? ""}
                placeholder="Apiaceae"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={v?.slug ?? ""}
              placeholder="funcho"
              aria-invalid={Boolean(state?.fieldErrors?.slug)}
            />
            <p className="text-xs text-muted-foreground">
              É a rota da ficha, o id da carta no deck Flora e o nome do ficheiro da
              imagem. Depois de publicada, não se muda.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Nomes */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="namePt">Nome PT</Label>
              <Input id="namePt" name="namePt" required defaultValue={v?.namePt ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nameEn">Nome EN</Label>
              <Input id="nameEn" name="nameEn" defaultValue={v?.nameEn ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nameEs">Nome ES</Label>
              <Input id="nameEs" name="nameEs" defaultValue={v?.nameEs ?? ""} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["Pt", "En", "Es"] as const).map((l) => (
              <div key={l} className="grid gap-2">
                <Label htmlFor={`aka${l}`}>Nomes locais {l.toUpperCase()}</Label>
                <Input
                  id={`aka${l}`}
                  name={`aka${l}`}
                  defaultValue={
                    l === "Pt" ? (v?.akaPt ?? "") : l === "En" ? (v?.akaEn ?? "") : (v?.akaEs ?? "")
                  }
                  placeholder="erva-doce, fiolho"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Separados por vírgula. Os nomes locais são metade do valor de pesquisa
            desta app: vale a pena procurá-los.
          </p>
        </CardContent>
      </Card>

      {/* Risco. Primeiro, de propósito. */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-3">
              {HERBARIUM_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag}
                    defaultChecked={v?.tags.includes(tag)}
                  />
                  {TAG_LABELS[tag]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              &ldquo;Comestível&rdquo; significa usada tradicionalmente como alimento, e não
              autorização para comer. Uma ficha comestível não é publicável sem
              sósias descritas.
            </p>
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="danger">Grau de risco</Label>
            <select
              id="danger"
              name="danger"
              defaultValue={String(v?.danger ?? 0)}
              className={selectClass}
            >
              {DANGER_LABELS.map((label, i) => (
                <option key={i} value={String(i)}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              A partir de 2, a app mostra o aviso ANTES do texto da ficha.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ecologia */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-2">
            <Label>Onde cresce</Label>
            <div className="flex flex-wrap gap-3">
              {HERBARIUM_HABITATS.map((h) => (
                <label key={h} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="habitat"
                    value={h}
                    defaultChecked={v?.habitat.includes(h)}
                  />
                  {HABITAT_LABELS[h]}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="monthsFlower">Meses em flor</Label>
              <Input
                id="monthsFlower"
                name="monthsFlower"
                defaultValue={v?.monthsFlower ?? ""}
                placeholder="6, 7, 8, 9"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthsFruit">Meses com fruto</Label>
              <Input
                id="monthsFruit"
                name="monthsFruit"
                defaultValue={v?.monthsFruit ?? ""}
                placeholder="9, 10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Texto */}
      <Card>
        <CardContent className="space-y-6 p-6">
          <Trio
            name="summary"
            label="Resumo"
            hint="Duas ou três frases. É o que se lê primeiro, e o que vai para o Google."
            values={{ pt: v?.summaryPt ?? "", en: v?.summaryEn ?? "", es: v?.summaryEs ?? "" }}
          />
          <Trio
            name="fieldMarks"
            label="Como se distingue"
            hint="O sinal concreto: o cheiro, a haste, o látex, o reverso da folha."
            values={{
              pt: v?.fieldMarksPt ?? "",
              en: v?.fieldMarksEn ?? "",
              es: v?.fieldMarksEs ?? "",
            }}
          />
          <Trio
            name="uses"
            label="Para que serve"
            hint="Uso tradicional, no passado, com fonte. Nunca dose nem indicação."
            values={{ pt: v?.usesPt ?? "", en: v?.usesEn ?? "", es: v?.usesEs ?? "" }}
          />
          <Trio
            name="legalNote"
            label="Nota legal (opcional)"
            hint="Protegida, invasora, proibido colher em área classificada."
            values={{
              pt: v?.legalNotePt ?? "",
              en: v?.legalNoteEn ?? "",
              es: v?.legalNoteEs ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* Estruturas ricas */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="lookalikes">Sósias (JSON)</Label>
            <textarea
              id="lookalikes"
              name="lookalikes"
              defaultValue={v?.lookalikes ?? "[]"}
              className={monoClass}
              aria-invalid={Boolean(state?.fieldErrors?.lookalikes)}
            />
            {state?.fieldErrors?.lookalikes && (
              <p className="text-xs text-destructive">{state.fieldErrors.lookalikes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {`[{"slug":"embude","scientificName":"Oenanthe crocata","name":{"pt":"Embude","en":"Hemlock water-dropwort","es":"Nabo del diablo"},"severity":3,"howToTell":{"pt":"…","en":"…","es":"…"}}]`}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="images">Imagens (JSON)</Label>
            <textarea
              id="images"
              name="images"
              defaultValue={v?.images ?? "[]"}
              className={monoClass}
              aria-invalid={Boolean(state?.fieldErrors?.images)}
            />
            {state?.fieldErrors?.images && (
              <p className="text-xs text-destructive">{state.fieldErrors.images}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Licença, autor e URL de origem são obrigatórios. Sem os três, a imagem
              não entra.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sources">Fontes (JSON)</Label>
            <textarea
              id="sources"
              name="sources"
              defaultValue={v?.sources ?? "[]"}
              className={monoClass}
              aria-invalid={Boolean(state?.fieldErrors?.sources)}
            />
            {state?.fieldErrors?.sources && (
              <p className="text-xs text-destructive">{state.fieldErrors.sources}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            defaultValue={v?.status ?? "draft"}
            className={selectClass}
          >
            {HERBARIUM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending} className="mt-6">
          {pending ? "A gravar…" : isEdit ? "Guardar" : "Criar ficha"}
        </Button>
      </div>
    </form>
  );
}

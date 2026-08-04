"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTrail, type TrailState } from "./actions";

export type TrailFormValues = {
  id: string;
  ref: string;
  nome: string;
  codigo: string;
  rede: string;
  concelho: string;
  distrito: string;
  regiao: string;
  areaProtegida: string;
  lat: string;
  lng: string;
  distanciaKm: string;
  tipo: string;
  duracao: string;
  dificuldade: string;
  tema: string;
  epoca: string;
  autorizacao: string;
  limiteGrupo: string;
  viagemLeiriaMin: string;
  potencial: string;
  estado: string;
  avisos: string;
  confianca: string;
  fonte: string;
  notas: string;
};

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";
const textareaClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed";

const ESTADOS = [
  "por triar","ideia","a reconhecer","reconhecido","ficha operacional","activo no site",
];

export function TrailForm({ trail }: { trail: TrailFormValues }) {
  const [state, formAction, pending] = useActionState<
    TrailState | undefined,
    FormData
  >(updateTrail.bind(null, trail.id), undefined);

  return (
    <form action={formAction} className="space-y-6">
      {/* Triagem: é o que falta na maioria das linhas */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Triagem
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Dificuldade e tema vieram vazios de propósito nos trilhos
              importados em massa: atribuí-los sem alguém ter feito o percurso
              seria inventar. Preenche ao triar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="dificuldade">Dificuldade</Label>
              <select
                id="dificuldade"
                name="dificuldade"
                defaultValue={trail.dificuldade}
                className={selectClass}
              >
                <option value="">Por atribuir</option>
                <option value="1">1 · Muito fácil</option>
                <option value="2">2 · Fácil</option>
                <option value="3">3 · Moderado</option>
                <option value="4">4 · Difícil</option>
                <option value="5">5 · Muito difícil</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tema">Tema</Label>
              <Input
                id="tema"
                name="tema"
                defaultValue={trail.tema}
                placeholder="geologia, água, aldeias..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="potencial">Potencial</Label>
              <select
                id="potencial"
                name="potencial"
                defaultValue={trail.potencial}
                className={selectClass}
              >
                <option value="">Por avaliar</option>
                <option value="A">A · reconhecer já</option>
                <option value="B">B · interessa, sem pressa</option>
                <option value="C">C · descartar</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                name="estado"
                defaultValue={trail.estado}
                className={selectClass}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notas">Notas internas</Label>
            <textarea
              id="notas"
              name="notas"
              defaultValue={trail.notas}
              rows={3}
              className={textareaClass}
              placeholder="O que confirmaste na câmara, o que viste no terreno, com que outro trilho combina."
            />
          </div>
        </CardContent>
      </Card>

      {/* Viabilidade comercial */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Viabilidade comercial
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              O limite de grupo passa automaticamente para as vagas máximas da
              caminhada quando criares uma a partir deste trilho.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="autorizacao">Autorização</Label>
              <Input
                id="autorizacao"
                name="autorizacao"
                defaultValue={trail.autorizacao}
                placeholder="não necessária, marcação prévia..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="limiteGrupo">Limite de participantes</Label>
              <Input
                id="limiteGrupo"
                name="limiteGrupo"
                inputMode="numeric"
                defaultValue={trail.limiteGrupo}
                placeholder="vazio = sem limite conhecido"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="viagemLeiriaMin">Viagem de Leiria (min)</Label>
              <Input
                id="viagemLeiriaMin"
                name="viagemLeiriaMin"
                inputMode="numeric"
                defaultValue={trail.viagemLeiriaMin}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="avisos">Avisos</Label>
            <textarea
              id="avisos"
              name="avisos"
              defaultValue={trail.avisos}
              rows={2}
              className={textareaClass}
              placeholder="Ardido, encerrado, bilhete obrigatório, quota diária..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados do percurso */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Percurso
          </h2>

          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required defaultValue={trail.nome} />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                name="codigo"
                defaultValue={trail.codigo}
                placeholder="PR4 PMS"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="distanciaKm">Distância (km)</Label>
              <Input
                id="distanciaKm"
                name="distanciaKm"
                inputMode="decimal"
                defaultValue={trail.distanciaKm}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                defaultValue={trail.tipo}
                className={selectClass}
              >
                <option value="">Por confirmar</option>
                <option value="circular">circular</option>
                <option value="linear">linear</option>
                <option value="ida-e-volta">ida-e-volta</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duracao">Duração (h)</Label>
              <Input id="duracao" name="duracao" defaultValue={trail.duracao} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="concelho">Concelho</Label>
              <Input id="concelho" name="concelho" defaultValue={trail.concelho} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regiao">Região</Label>
              <Input id="regiao" name="regiao" defaultValue={trail.regiao} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="areaProtegida">Área protegida</Label>
              <Input
                id="areaProtegida"
                name="areaProtegida"
                defaultValue={trail.areaProtegida}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="epoca">Época</Label>
              <Input id="epoca" name="epoca" defaultValue={trail.epoca} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                name="lat"
                inputMode="decimal"
                defaultValue={trail.lat}
                placeholder="39.5433"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                name="lng"
                inputMode="decimal"
                defaultValue={trail.lng}
                placeholder="-8.735"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ponto de partida. Sem coordenadas, a caminhada criada a partir deste
            trilho não aparece no mapa do site. Tira-as do Google Maps: botão
            direito no ponto, o primeiro valor é a latitude.
          </p>

          <div className="grid gap-2 sm:max-w-[200px]">
            <Label htmlFor="confianca">Confiança dos dados</Label>
            <select
              id="confianca"
              name="confianca"
              defaultValue={trail.confianca}
              className={selectClass}
            >
              <option value="alta">alta · fonte oficial</option>
              <option value="média">média · por confirmar</option>
              <option value="baixa">baixa · sem fonte</option>
            </select>
          </div>

          <p className="text-xs text-muted-foreground">
            Origem: <span className="font-mono">{trail.fonte || "sem fonte"}</span>
            {" · "}rede {trail.rede || "?"}
            {" · "}ref <span className="font-mono">{trail.ref}</span>
          </p>
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

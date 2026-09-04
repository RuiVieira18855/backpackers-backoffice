# @backpackers/trail-core

Shared TRAIL assessment logic — question bank, per-pillar content, scoring, and shared types. Consumed by both `outpost` (backoffice) and `trail-web` (standalone).

## Install (via file: dep)

In each consumer's `package.json`:

```json
{
  "dependencies": {
    "@backpackers/trail-core": "file:../packages/trail-core"
  }
}
```

Then `npm install`.

## Exports

```ts
import { TRAIL_QUESTIONS } from "@backpackers/trail-core/questions";
import { TRAIL_CONTENT, overallReading, scoreBandFor } from "@backpackers/trail-core/content";
import { computeScores, dominantValue, sortedByScore } from "@backpackers/trail-core/scoring";
import type { TrailValueKey, TrailScores } from "@backpackers/trail-core/types";
```

Or via the root export:

```ts
import { TRAIL_QUESTIONS, TRAIL_CONTENT, computeScores } from "@backpackers/trail-core";
```

## Roadmap

- v0.1 — extracted from trail-web
- v0.2 — Outpost consumes (delete duplicates in backoffice)
- v0.3 — mobile app consumes (same file: dep)
- v1.0 — published to npm registry (private) when API is stable

## Files

| File | Purpose |
|---|---|
| `src/types.ts` | `TrailValueKey`, `TRAIL_VALUE_KEYS`, `TRAIL_VALUE_LABELS`, `TrailScores` |
| `src/questions.ts` | The 42 Likert questions (PT-PT) |
| `src/content.ts` | Deep per-pillar content + `overallReading()` + `scoreBandFor()` |
| `src/scoring.ts` | `computeScores()`, `dominantValue()`, `sortedByScore()` |
| `src/index.ts` | Barrel re-export of all the above |

---

## Nota: esta pasta é uma cópia vendorizada

A fonte de verdade é `backpackers-group/packages/trail-core`, partilhada com o
`trail-web` e o `trail-mobile`. Esta cópia existe porque o Outpost tem
repositório próprio e é publicado a partir da sua própria pasta: uma dependência
`file:../packages/trail-core` aponta para fora do que sobe no deploy, e fazia
falhar o build no Vercel com "Can't resolve @backpackers/trail-core/scoring".

É o mesmo padrão que o `trailhead-web` já usa para os seus cores.

**Ao mexer no trail-core partilhado, copiar para aqui outra vez.** Se as duas
versões divergirem, o Outpost e o trail-web deixam de pontuar da mesma maneira.

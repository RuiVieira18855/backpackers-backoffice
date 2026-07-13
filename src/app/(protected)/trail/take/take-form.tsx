"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  finishAssessment,
  submitAnswerBatch,
} from "../actions";

type Question = { id: string; statement: string; value: string };
const LIKERT_OPTIONS = [1, 2, 3, 4, 5];

export function TakeForm({
  assessmentId,
  questions,
  initialAnswers,
}: {
  assessmentId: string;
  questions: Question[];
  initialAnswers: Record<string, number>;
}) {
  const t = useTranslations("trail.take");
  const tLikert = useTranslations("trail.likert");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [index, setIndex] = useState(() => {
    const first = questions.findIndex((q) => !(q.id in initialAnswers));
    return first === -1 ? 0 : first;
  });
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const total = questions.length;
  const current = questions[index];
  const progress = useMemo(() => {
    const done = Object.keys(answers).length;
    return Math.round((done / total) * 100);
  }, [answers, total]);

  function selectLikert(likert: number) {
    setAnswers((prev) => ({ ...prev, [current.id]: likert }));
    setDirty((prev) => new Set(prev).add(current.id));
  }

  function persistDirty(): Promise<boolean> {
    if (dirty.size === 0) return Promise.resolve(true);
    const batch = Array.from(dirty).map((qid) => ({
      questionId: qid,
      likert: answers[qid],
    }));
    return submitAnswerBatch({ assessmentId, answers: batch }).then((r) => {
      if (!r.ok) {
        toast.error(r.error);
        return false;
      }
      setDirty(new Set());
      return true;
    });
  }

  function goNext() {
    startTransition(async () => {
      const ok = await persistDirty();
      if (!ok) return;
      if (index < total - 1) setIndex(index + 1);
    });
  }

  function goPrev() {
    startTransition(async () => {
      const ok = await persistDirty();
      if (!ok) return;
      if (index > 0) setIndex(index - 1);
    });
  }

  function finish() {
    startTransition(async () => {
      const ok = await persistDirty();
      if (!ok) return;
      const result = await finishAssessment(assessmentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/trail/${result.assessmentId}`);
    });
  }

  const answered = current.id in answers;
  const allAnswered = questions.every((q) => q.id in answers);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t("progress", { done: index + 1, total })}
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="tabular-nums">{progress}%</span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <p className="text-lg text-foreground leading-relaxed">
            {current.statement}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {LIKERT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => selectLikert(n)}
                aria-pressed={answers[current.id] === n}
                className={`flex flex-col items-center gap-1 rounded-md border py-3 px-2 transition-colors ${
                  answers[current.id] === n
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border hover:border-accent/50 text-muted-foreground"
                }`}
              >
                <span className="text-lg font-medium">{n}</span>
                <span className="text-[10px] uppercase tracking-wider text-center leading-tight">
                  {tLikert(`v${n}`)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={pending || index === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("prev")}
        </Button>

        {index < total - 1 ? (
          <Button onClick={goNext} disabled={pending || !answered}>
            {t("next")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={pending || !allAnswered}>
            <Check className="mr-2 h-4 w-4" />
            {pending ? t("finishing") : t("finish")}
          </Button>
        )}
      </div>

      {!allAnswered && index === total - 1 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("stillMissing", {
            count: total - Object.keys(answers).length,
          })}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAction } from "@/app/kursus/actions";
import { Button } from "@/components/ui/button";
import type { Quiz, QuizOption, QuizQuestion } from "@/types";

export interface QuizRunnerData {
  quiz: Quiz;
  questions: Array<QuizQuestion & { options: QuizOption[] }>;
  bestScore: number | null;
  stepCompleted: boolean;
}

export function QuizRunner({ data }: { data: QuizRunnerData }) {
  const router = useRouter();
  const { quiz, questions, bestScore, stepCompleted } = data;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);

  const unanswered = questions.filter((q) => !answers[q.id]).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await submitQuizAction(quiz.id, answers);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menilai. Coba lagi.");
      return;
    }
    const d = (res.data ?? {}) as { score: number; passed: boolean; correct: number; total: number };
    setResult({ score: d.score, passed: d.passed, correct: d.correct, total: d.total });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span>
          Nilai lulus: <strong className="text-ink">{quiz.pass_score}</strong>
        </span>
        {bestScore !== null && (
          <span className="border border-line bg-mist px-2.5 py-1 text-xs">
            Nilai terbaikmu: <strong className="text-ink">{bestScore}</strong>
          </span>
        )}
        {stepCompleted && (
          <span className="border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
            Sudah lulus ✓
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        {questions.map((q, qi) => (
          <fieldset key={q.id} className="border border-line bg-white p-5">
            <legend className="sr-only">Soal {qi + 1}</legend>
            <p className="font-medium leading-relaxed">
              <span className="mr-2 text-stone-500">{qi + 1}.</span>
              {q.question}
            </p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Pilihan soal ${qi + 1}`}>
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-3 border px-3 py-2.5 text-sm transition-colors ${
                    answers[q.id] === o.id
                      ? "border-ink bg-mist font-medium"
                      : "border-line hover:border-stone-400"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={o.id}
                    checked={answers[q.id] === o.id}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    className="mt-1 accent-[#1d1d1f]"
                  />
                  <span>{o.text}</span>
                </label>
              ))}
            </div>
            {result && q.explanation && (
              <p className="mt-3 border-l-2 border-accent bg-mist px-3 py-2 text-sm text-stone-700">
                {q.explanation}
              </p>
            )}
          </fieldset>
        ))}

        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {result && (
          <div
            role="status"
            className={`border px-4 py-3 text-sm ${
              result.passed
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {result.passed ? (
              <>
                <strong>Lulus! Nilai {result.score}</strong> ({result.correct}/{result.total} benar).
                Langkah ini selesai — lanjut ke langkah berikut.
              </>
            ) : (
              <>
                <strong>Belum lulus — nilai {result.score}</strong> ({result.correct}/{result.total} benar,
                butuh {quiz.pass_score}). Pelajari lagi videonya, lalu coba lagi.
              </>
            )}
          </div>
        )}

        <Button type="submit" disabled={pending || unanswered > 0} className="h-11 rounded-full px-7">
          {pending
            ? "Menilai…"
            : unanswered > 0
              ? `Jawab dulu (${unanswered} tersisa)`
              : "Kumpulkan jawaban"}
        </Button>
      </form>
    </div>
  );
}

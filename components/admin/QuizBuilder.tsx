"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  addOptionAction,
  addQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  saveQuizAction,
  setCorrectOptionAction,
} from "@/app/admin/course-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface AdminQuizOption {
  id: string;
  position: number;
  text: string;
  is_correct: boolean;
}

export interface AdminQuizQuestion {
  id: string;
  position: number;
  question: string;
  explanation: string | null;
  options: AdminQuizOption[];
}

export function QuizBuilder({
  stepId,
  stepTitle,
  quiz,
  questions,
}: {
  stepId: string;
  stepTitle: string;
  quiz: { id: string; title: string; pass_score: number } | null;
  questions: AdminQuizQuestion[];
}) {
  const router = useRouter();
  const [qTitle, setQTitle] = useState(quiz?.title ?? `Kuis: ${stepTitle}`);
  const [pass, setPass] = useState(quiz?.pass_score ?? 70);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Form soal baru
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [opts, setOpts] = useState([
    { text: "", correct: true },
    { text: "", correct: false },
  ]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setPending(true);
    const res = await fn();
    setPending(false);
    if (!res.ok) setError(res.error ?? "Gagal.");
    else router.refresh();
  }

  async function onSaveQuiz(e: React.FormEvent) {
    e.preventDefault();
    await run(() => saveQuizAction(stepId, { title: qTitle, passScore: pass }));
  }

  async function onAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!quiz) {
      setError("Simpan pengaturan kuis dulu.");
      return;
    }
    await run(() =>
      addQuestionAction(quiz.id, { question, explanation, options: opts })
    );
    setQuestion("");
    setExplanation("");
    setOpts([
      { text: "", correct: true },
      { text: "", correct: false },
    ]);
  }

  return (
    <div className="border border-line bg-white p-5">
      <h3 className="font-serif text-lg font-bold">Kuis langkah ini</h3>

      <form onSubmit={onSaveQuiz} className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Judul kuis</Label>
          <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Nilai lulus</Label>
          <Input type="number" min={0} max={100} value={pass} onChange={(e) => setPass(Number(e.target.value))} />
        </div>
        <Button type="submit" disabled={pending} className="h-10 px-5 text-sm">
          Simpan
        </Button>
      </form>

      {quiz && (
        <>
          <ol className="mt-5 space-y-3">
            {questions.map((q, qi) => (
              <li key={q.id} className="border border-line bg-paper px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="mr-2 text-stone-500">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Hapus soal ini beserta opsinya?")) {
                        run(() => deleteQuestionAction(q.id));
                      }
                    }}
                    aria-label="Hapus soal"
                    className="p-1.5 text-stone-400 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {q.explanation && (
                  <p className="mt-1 text-xs text-stone-500">Penjelasan: {q.explanation}</p>
                )}
                <ul className="mt-2 space-y-1.5">
                  {q.options.map((o) => (
                    <li key={o.id} className={`flex items-center gap-2 border px-2.5 py-1.5 text-sm ${o.is_correct ? "border-green-300 bg-green-50 font-medium" : "border-line"}`}>
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={o.is_correct}
                        onChange={() => run(() => setCorrectOptionAction(o.id))}
                        aria-label={`Tandai benar: ${o.text}`}
                        className="accent-green-700"
                      />
                      <span className="flex-1">{o.text}</span>
                      {o.is_correct && <span className="text-xs text-green-800">✓ benar</span>}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Hapus opsi ini?")) {
                            run(() => deleteOptionAction(o.id));
                          }
                        }}
                        aria-label="Hapus opsi"
                        className="p-1 text-stone-400 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <AddOptionForm
                  questionId={q.id}
                  onDone={() => router.refresh()}
                  onError={setError}
                />
              </li>
            ))}
            {questions.length === 0 && (
              <li className="border border-dashed border-line px-4 py-6 text-center text-sm text-stone-600">
                Belum ada soal. Tambah di bawah, minimal 2 opsi, tepat 1 benar.
              </li>
            )}
          </ol>

          <form onSubmit={onAddQuestion} className="mt-4 space-y-3 border-t border-line pt-4">
            <h4 className="text-sm font-bold">Tambah soal</h4>
            <div className="space-y-1.5">
              <Label>Pertanyaan</Label>
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} required />
            </div>
            <div className="space-y-1.5">
              <Label>Penjelasan (tampil setelah peserta mengumpulkan)</Label>
              <Input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="space-y-2">
              <Label>Opsi (radio = jawaban benar)</Label>
              {opts.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="new-correct"
                    checked={o.correct}
                    onChange={() => setOpts(opts.map((x, xi) => ({ ...x, correct: xi === i })))}
                    aria-label={`Opsi ${i + 1} benar`}
                    className="accent-green-700"
                  />
                  <Input
                    value={o.text}
                    onChange={(e) => setOpts(opts.map((x, xi) => (xi === i ? { ...x, text: e.target.value } : x)))}
                    placeholder={`Opsi ${i + 1}`}
                  />
                  {opts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOpts(opts.filter((_, xi) => xi !== i))}
                      aria-label="Hapus baris opsi"
                      className="p-1.5 text-stone-400 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {opts.length < 6 && (
                <button
                  type="button"
                  onClick={() => setOpts([...opts, { text: "", correct: false }])}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  + Tambah baris opsi
                </button>
              )}
            </div>
            <Button type="submit" disabled={pending} className="h-10 px-6 text-sm">
              Tambah soal
            </Button>
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

function AddOptionForm({
  questionId,
  onDone,
  onError,
}: {
  questionId: string;
  onDone: () => void;
  onError: (m: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setPending(true);
    const res = await addOptionAction(questionId, text);
    setPending(false);
    if (!res.ok) {
      onError(res.error ?? "Gagal.");
      return;
    }
    setText("");
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Opsi baru…" className="h-9 text-sm" />
      <Button type="submit" disabled={pending || !text.trim()} className="h-9 shrink-0 px-4 text-sm">
        + Opsi
      </Button>
    </form>
  );
}

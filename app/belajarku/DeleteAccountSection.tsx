"use client";

import { useState } from "react";
import { deleteAccountAction } from "./actions";

export function DeleteAccountSection({ email }: { email: string }) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    setPending(true);
    const res = await deleteAccountAction();
    setPending(false);
    // Sukses → redirect dari server. Gagal → tampilkan pesan.
    if (!res.ok) setError(res.error ?? "Gagal menghapus akun.");
  }

  return (
    <section aria-label="Zona berbahaya" className="mt-12 border border-red-200 bg-white p-5">
      <h2 className="font-serif text-xl font-bold text-red-900">Zona berbahaya</h2>
      <p className="mt-1 text-sm text-stone-600">
        Menghapus akun <strong>{email}</strong> akan menghapus permanen: pendaftaran kursus,
        progres, nilai kuis, dan komentarmu. Tidak bisa dibatalkan.
      </p>
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-3 inline-flex h-10 items-center rounded-full border border-red-300 px-5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Hapus akunku…
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <label htmlFor="delete-confirm" className="block text-sm font-medium">
            Ketik <code className="bg-red-50 px-1">HAPUS</code> untuk konfirmasi:
          </label>
          <input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder="HAPUS"
            className="h-10 w-48 border border-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          />
          {error && (
            <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending || typed.trim().toUpperCase() !== "HAPUS"}
              className="inline-flex h-10 items-center rounded-full bg-red-700 px-6 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {pending ? "Menghapus…" : "Ya, hapus permanen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setTyped("");
                setError(null);
              }}
              className="inline-flex h-10 items-center rounded-full border border-line px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

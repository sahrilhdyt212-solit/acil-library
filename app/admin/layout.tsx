import Link from "next/link";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/admin/actions";
import { AcilMark } from "@/components/brand/AcilMark";

const NAV = [
  { href: "/admin", label: "Dasbor", icon: LayoutDashboard },
  { href: "/admin/books", label: "Buku", icon: BookOpen },
  { href: "/admin/categories", label: "Kategori", icon: FolderOpen },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders without the shell.
  return <AdminShell>{children}</AdminShell>;
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  // This layout is used for /admin/login too; only guard non-login routes via segment check below.
  // We render the shell only when a session exists; otherwise render bare children.
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    email = null;
  }

  if (!email) {
    // Middleware redirects protected routes; login page falls through here.
    return <div className="flex min-h-screen flex-col bg-paper">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-[#141210] text-stone-300 md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-5 pb-6 pt-6">
          <AcilMark invert className="h-9 w-9" />
          <span className="leading-none">
            <span className="block font-serif text-base font-bold text-paper">ACIL LIBRARY</span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-stone-500">Admin</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate px-1 text-xs text-stone-500" title={email}>
            {email}
          </p>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-stone-300 hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
            </button>
          </form>
          <Link
            href="/"
            className="mt-1 block px-3 py-2 text-xs text-stone-500 hover:text-paper"
          >
            ← Lihat situs publik
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (mobile + session) */}
        <div className="flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3 md:hidden">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <AcilMark className="h-8 w-8" />
            <span className="hidden font-serif text-sm font-bold min-[380px]:block">ACIL · Admin</span>
          </Link>
          <nav className="flex items-center gap-0.5 text-[13px] sm:gap-1 sm:text-sm" aria-label="Admin seluler">
            <Link href="/admin" className="px-1.5 py-1 font-medium sm:px-2">Dasbor</Link>
            <Link href="/admin/books" className="px-1.5 py-1 font-medium sm:px-2">Buku</Link>
            <Link href="/admin/categories" className="px-1.5 py-1 font-medium sm:px-2">Kategori</Link>
            <form action={signOutAction}>
              <button type="submit" aria-label="Keluar" className="p-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </nav>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

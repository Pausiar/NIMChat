import Link from "next/link";
import { LEGAL } from "@/lib/legal-config";

const LINKS = [
  { href: "/legal/aviso-legal", label: "Aviso legal" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos de uso" },
  { href: "/legal/almacenamiento", label: "Almacenamiento local" },
];

/** Dato del titular; si falta, se ve resaltado para que no pase desapercibido. */
export function Owner({ field, label }: { field: keyof typeof LEGAL; label: string }) {
  const value = LEGAL[field];
  if (value) return <>{value}</>;
  return (
    <mark className="rounded bg-nim-yellow/20 px-1 text-nim-yellow">[PENDIENTE: {label}]</mark>
  );
}

export function LegalDoc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Volver a {LEGAL.appName}
      </Link>
      <nav aria-label="Documentos legales" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-white/60 underline-offset-4 hover:text-nim-yellow hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-xs text-white/40">Última actualización: {LEGAL.lastUpdated}</p>
      <article className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/75 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_a]:text-nim-yellow [&_a]:underline">
        {children}
      </article>
    </main>
  );
}

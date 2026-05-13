import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NimChat — Open-source LLMs via NVIDIA NIM",
  description:
    "Interfaz unificada y gratuita para los mejores modelos open-source mediante NVIDIA NIM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#0a0a0b] text-white antialiased">
        {children}
      </body>
    </html>
  );
}

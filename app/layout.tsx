import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "NimChat — Open-source LLMs via NVIDIA NIM",
  description:
    "Interfaz unificada y gratuita para los mejores modelos open-source mediante NVIDIA NIM.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NimChat", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/NIMChat-noBG.png",
    shortcut: "/NIMChat-noBG.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

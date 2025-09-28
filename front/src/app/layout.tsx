import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GoogleScripts } from "@/components/GoogleScripts";
import { UTMInitializer } from "@/components/UTMInitializer";

export const metadata: Metadata = {
  title: "Renato 'Trezoitão' Amoedo — Bitcoin, Cristianismo e Soberania Individual",
  description: "Baixe grátis o e-book 'Bitcoin Red Pill (3ª Edição)' e comece hoje sua jornada de soberania individual com Renato 'Trezoitão' Amoedo.",
  metadataBase: new URL("https://renato38.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Renato 'Trezoitão' Amoedo — Bitcoin, Cristianismo e Soberania Individual",
    description: "Baixe grátis o e-book 'Bitcoin Red Pill (3ª Edição)' e comece hoje sua jornada de soberania individual com Renato 'Trezoitão' Amoedo.",
    url: "https://renato38.com.br",
    siteName: "Renato 38",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Renato Trezoitão Amoedo - Bitcoin Red Pill",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Renato 'Trezoitão' Amoedo — Bitcoin, Cristianismo e Soberania Individual",
    description: "Baixe grátis o e-book 'Bitcoin Red Pill (3ª Edição)'",
    images: ["/images/og-default.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <GoogleScripts />
        <UTMInitializer />
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
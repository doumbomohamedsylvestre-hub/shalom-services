import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/providers/query-provider";
import { SITE } from "@/shared/site";
import "./globals.css";

// Inter: the closest web face to Apple's system UI font, with optical sizing.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Monospace for ticket codes, amounts in tables and receipts.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: {
    default: `${SITE.name} | Réparation de téléphones à Bamako`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.tagline,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} à Sénou, Bamako`,
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/twitter-image.png"] },
  other: { "msapplication-config": "/browserconfig.xml" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#061b38" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

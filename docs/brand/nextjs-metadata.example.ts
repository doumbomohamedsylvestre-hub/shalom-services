// Copy into app/layout.tsx and merge with your existing metadata exports.
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  applicationName: 'Shalom Service',
  title: 'Shalom Service | Réparation de téléphones à Bamako',
  description: 'Réparation, entretien et accessoires pour smartphones à Sénou, Bamako, Mali.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Shalom Service',
    description: 'Réparation • Entretien • Accessoires — Bamako, Sénou, Mali',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Shalom Service à Sénou, Bamako' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/twitter-image.png'],
  },
  // Safari pinned tab and legacy Windows tiles can additionally be linked
  // manually in app/layout.tsx if those platforms matter to your audience.
};

export const viewport: Viewport = { themeColor: '#07274d' };

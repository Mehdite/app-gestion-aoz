import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Assurances Oued Zem', template: '%s | Assurances Oued Zem' },
  description: 'Système de gestion d\'agence d\'assurance — Assurances Oued Zem',
  robots: 'noindex,nofollow',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AOZ Gestion',
  },
};

export const viewport: Viewport = {
  themeColor: '#091F3D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

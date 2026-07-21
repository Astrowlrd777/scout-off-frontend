import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { WalletProvider } from '@/context/WalletContext';
import ContractPausedBanner from '@/components/ContractPausedBanner';
import ConfigWarningBanner from '@/components/ConfigWarningBanner';
import ServiceWorkerUpdateBanner from '@/components/ServiceWorkerUpdateBanner';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { validateConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'ScoutOff — Decentralized Football Scouting',
  description:
    'Tamper-proof player profiles, verifiable milestones, and direct scout-to-player connections — powered by Stellar Soroban smart contracts.',
  openGraph: {
    title: 'ScoutOff — Decentralized Football Scouting',
    description:
      'Tamper-proof player profiles, verifiable milestones, and direct scout-to-player connections — powered by Stellar Soroban smart contracts.',
    url: 'https://scoutoff.app',
    siteName: 'ScoutOff',
    type: 'website',
    images: [
      {
        url: 'https://scoutoff.app/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'ScoutOff — Decentralized Football Scouting on Stellar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScoutOff — Decentralized Football Scouting',
    description:
      'Tamper-proof player profiles, verifiable milestones, and direct scout-to-player connections — powered by Stellar Soroban smart contracts.',
    images: ['https://scoutoff.app/og-image.svg'],
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? 'en';
  const messages = await getMessages();

  // Runtime configuration check — fires on every request so a deployment
  // with missing env vars (e.g. NEXT_PUBLIC_CONTRACT_ID not set in the
  // hosting platform) surfaces a clear warning immediately instead of
  // failing deep inside a Soroban RPC call.
  const configWarnings = validateConfig();

  return (
    <html lang={locale}>
      <head>
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/icon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/icon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        {/* Keep in sync with brand.dark in tailwind.config.ts, --bg in app/globals.css, and theme_color/background_color in public/manifest.json */}
        <meta name="theme-color" content="#0a0f1e" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand-green focus:text-black focus:px-6 focus:py-3 focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WalletProvider>
            <ToastProvider>
              <ConfigWarningBanner warnings={configWarnings} />
              <ServiceWorkerUpdateBanner />
              <Navbar />
              <ContractIncompatibleBanner />
              <ContractPausedBanner />
              <main id="main-content" className="max-w-6xl mx-auto px-4 py-8">
                {children}
              </main>
            </ToastProvider>
          </WalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

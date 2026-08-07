import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// Absolute base for OG/Twitter image URLs. Without it Next falls back to
// localhost:3000 at build time and social cards resolve to a dead host.
// Vercel injects VERCEL_PROJECT_PRODUCTION_URL on every deploy; NEXT_PUBLIC_SITE_URL
// overrides it for self-hosting or a custom domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://datacenter-globe.vercel.app');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Datacenter Globe — 3D Datacenter Map',
  description:
    'Interactive 3D atlas of ~18,000 datacenters, public-cloud regions, and the global submarine cable network. Click a country to explore; click a site for a virtual tour.',
  openGraph: {
    title: 'Datacenter Globe',
    description:
      'Interactive 3D atlas of ~18,000 datacenters, public-cloud regions, and the global submarine cable network.',
    url: siteUrl,
    siteName: 'Datacenter Globe',
    images: [{ url: '/og.png', width: 1440, height: 900, alt: 'Datacenter Globe' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Datacenter Globe',
    description:
      'Interactive 3D atlas of ~18,000 datacenters worldwide. Click any country, search any operator, drop into a virtual tour.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0c0c0e',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overscroll-none">{children}</body>
    </html>
  );
}

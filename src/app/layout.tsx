import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import PWAInstallBanner from '@/components/pwa-install';

export const metadata: Metadata = {
  title: 'MetroTrack Delhi',
  description: 'Live Delhi Metro tracking and navigation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1E88E5" />
      </head>
      <body className="font-body antialiased">
        <PWAInstallBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { ConditionalShell } from './ConditionalShell';
import { ThemeProvider } from '@/context/ThemeProvider';
import { AuthProvider } from '@/context/AuthProvider';

export const metadata: Metadata = {
  title: 'DocAgent — AI Document Assistant',
  description: 'Upload documents, ask questions, get AI-powered answers with source citations.',
  keywords: ['AI', 'document assistant', 'RAG', 'PDF chat', 'DocAgent'],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'DocAgent — AI Document Assistant',
    description: 'Chat with your documents using powerful AI.',
    type: 'website',
  },
};

// Required for env(safe-area-inset-*) to work on iOS Safari (gesture bar phones)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ConditionalShell>{children}</ConditionalShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


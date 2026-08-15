import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ErrorBoundary } from '@/components/shared';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MedAid Advisor',
  description: 'Medical aid plan selection and advisory tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
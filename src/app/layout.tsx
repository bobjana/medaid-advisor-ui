import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar, Header } from '@/components/layout';
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
        <ErrorBoundary>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
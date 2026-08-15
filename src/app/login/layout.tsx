import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MedAid Advisor — Sign In',
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  );
}

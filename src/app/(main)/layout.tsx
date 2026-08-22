import { cookies } from 'next/headers';
import { Sidebar } from '@/components/layout';

function decodeSessionUsername(session: string | undefined): string | null {
  if (!session) return null;
  const dotIndex = session.indexOf('.');
  if (dotIndex === -1) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(session.slice(0, dotIndex), 'base64url').toString('utf8'),
    );
    return typeof payload.username === 'string' ? payload.username : null;
  } catch {
    return null;
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const username = decodeSessionUsername(
    cookieStore.get('medaid-session')?.value,
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar username={username} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'MeterMate — Shared utility tracker',
  description: 'Manage water pump contributions and shared electricity costs offline and on the go.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MeterMate',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-slate-950 font-sans antialiased text-slate-100 min-h-screen">
        {/* Maximum 430px Container centered on Desktop */}
        <div className="relative mx-auto min-h-screen max-w-[430px] bg-slate-900 shadow-2xl flex flex-col border-x border-slate-800 pb-20">
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>
          <BottomNav role={user?.role} />
        </div>
      </body>
    </html>
  );
}


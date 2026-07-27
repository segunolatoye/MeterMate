import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import GlobalHeader from '@/components/GlobalHeader';
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
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-[#020617] font-sans antialiased text-slate-100 min-h-screen relative selection:bg-green-500/30">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center z-[-1]">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-20%] left-1/4 w-[600px] h-[300px] bg-slate-800/40 blur-[100px] rounded-full"></div>
        </div>

        {/* Maximum 430px Container centered on Desktop */}
        <div className="relative mx-auto min-h-screen max-w-[430px] bg-slate-900/40 backdrop-blur-3xl shadow-2xl flex flex-col border-x border-white/5">
          <GlobalHeader user={user} />
          <main className="flex-1 w-full flex flex-col relative z-0">
            {children}
          </main>
          <BottomNav role={user?.role} />
        </div>
      </body>
    </html>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell, 
  X, 
  Loader2, 
  CheckCircle, 
  Zap, 
  Droplets, 
  Info,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'electricity_tenant' | 'water_only_tenant';
  room_label?: string;
  deposit_amount: number;
}

interface GlobalHeaderProps {
  user?: UserProfile | null;
}

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  sender_id: string;
  target: string;
}

export default function GlobalHeader({ user }: GlobalHeaderProps) {
  const pathname = usePathname();

  // If path is public or auth, do not show navigation header
  if (
    !user ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname === '/'
  ) {
    return null;
  }

  const activeUser = user;
  const isAdmin = activeUser.role === 'admin';

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch notification log when menu is opened
  useEffect(() => {
    if (menuOpen) {
      loadNotificationLogs();
    }
  }, [menuOpen]);

  async function loadNotificationLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/notifications/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.notifications) {
          // Filter out cleared notifications using localStorage
          const clearedData = localStorage.getItem('cleared_notifs');
          const clearedIds = clearedData ? JSON.parse(clearedData) : [];
          
          const activeNotifs = data.notifications.filter(
            (notif: NotificationLog) => !clearedIds.includes(notif.id)
          );
          
          setNotifications(activeNotifs);
        }
      }
    } catch (err) {
      console.error('Failed to grab historic logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  function handleClearAll() {
    // Save current active notifications to cleared storage
    const currentIds = notifications.map(n => n.id);
    if (currentIds.length === 0) return;

    const clearedData = localStorage.getItem('cleared_notifs');
    let clearedIds = clearedData ? JSON.parse(clearedData) : [];
    
    // Merge without duplicates
    clearedIds = Array.from(new Set([...clearedIds, ...currentIds]));
    
    localStorage.setItem('cleared_notifs', JSON.stringify(clearedIds));
    setNotifications([]); // Clear UI immediately
  }

  // Format relative timestamp
  function formatRelativeTime(dateString: string) {
    try {
      const past = new Date(dateString).getTime();
      const now = Date.now();
      const diffMs = now - past;
      
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 60) return 'Just now';
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (e) {
      return 'Recent';
    }
  }

  // Choose icon based on notification title/type
  function getNotificationIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('electricity') || t.includes('token') || t.includes('prepayment')) {
      return <Zap className="h-4 w-4 text-emerald-400" />;
    }
    if (t.includes('water') || t.includes('pumping') || t.includes('levy')) {
      return <Droplets className="h-4 w-4 text-blue-400" />;
    }
    if (t.includes('confirm') || t.includes('audit')) {
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    }
    return <Info className="h-4 w-4 text-slate-400" />;
  }

  return (
    <>
      {/* Visual Top Bar Header */}
      <header className="sticky top-0 z-40 h-[56px] w-full bg-slate-950/80 backdrop-blur-md px-5 py-3.5 flex items-center justify-between" id="global-application-header">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity" id="header-branding">
          <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs" id="header-accent-brand-icon">
            <Zap className="h-3.5 w-3.5 fill-emerald-400/15" />
          </div>
          <span className="font-extrabold text-[13px] tracking-wider uppercase font-sans text-slate-200">
            MeterMate
          </span>
        </Link>

        {/* Header interactive Actions */}
        <div className="flex items-center gap-2">
          {/* Dashboard Notifications Bell */}
          <button
            onClick={() => setMenuOpen(true)}
            id="open-notifications-menu-btn"
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            aria-label="Open notifications center"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Quick role tag */}
          <span className="text-[9px] font-bold font-mono px-2 py-1 rounded-lg bg-slate-900 text-slate-400 uppercase tracking-widest">
            {isAdmin ? 'Landlord' : 'Tenant'}
          </span>
        </div>
      </header>

      {/* Slide-over Notifications Fullscreen Panel Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="notifications-drawer-backdrop">
            {/* Backdrop Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Content Drawer (Slides from right or bottom depending on mobile dimensions) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 mx-auto max-w-[430px] h-[90vh] bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col"
              id="notifications-overlay-panel"
            >
              {/* Drawer Draggable bar decoration */}
              <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto my-3 shrink-0" />

              {/* Drawer Header Block */}
              <div className="px-5 pb-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col text-left">
                  <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-emerald-400" /> Alert Center
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                    Your real-time compound utility updates
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                    title="Clear All Notifications"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setMenuOpen(false)}
                    id="close-notifications-menu-btn"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 text-left flex flex-col gap-4 bg-slate-950">
                
                <div className="flex flex-col gap-3" id="notif-tab-logs-view">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                      Recent Alerts Feed
                    </span>
                    <button
                      onClick={loadNotificationLogs}
                      className="text-[10px] text-emerald-400 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1"
                      disabled={loadingLogs}
                    >
                      {loadingLogs ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : 'Refresh'}
                    </button>
                  </div>

                  {loadingLogs && notifications.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                      <span className="text-[10px] text-slate-500">Querying compound notifications...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400">Zero notifications posted</span>
                        <span className="text-[9px] text-slate-500 max-w-xs px-4">
                          You are all caught up! No active broadcast alerts available.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5" id="notif-logs-list">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          className="bg-slate-900 rounded-xl p-3.5 flex items-start gap-3 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                            {getNotificationIcon(notif.title)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 truncate pr-1">
                                {notif.title}
                              </span>
                              <span className="text-[8.5px] font-mono text-slate-500 shrink-0 uppercase tracking-widest">
                                {formatRelativeTime(notif.created_at)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed mt-1 text-left">
                              {notif.body}
                            </p>
                            {notif.target !== 'all' && (
                              <span className="inline-flex mt-2 text-[8px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                                🔐 Private Alert
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Drawer footer decoration element */}
              <div className="bg-slate-900 px-5 py-3 shrink-0 rounded-b-none">
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 tracking-wider">
                  <span>METERMATE NOTIFICATION LOG</span>
                  <span>V2.2</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

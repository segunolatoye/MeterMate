'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, History, User, Shield, BarChart } from 'lucide-react';

interface BottomNavProps {
  role?: 'admin' | 'electricity_tenant' | 'water_only_tenant';
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  // If path is auth, do not show navigation
  if (pathname.includes('/login') || pathname.includes('/register') || pathname === '/') {
    return null;
  }

  const isAdmin = role === 'admin';

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Pay Now',
      icon: CreditCard,
      href: '/dashboard/pay',
      active: pathname === '/dashboard/pay',
    },
    {
      label: 'History',
      icon: History,
      href: '/dashboard/history',
      active: pathname === '/dashboard/history',
    },
    {
      label: 'Report',
      icon: BarChart,
      href: '/report',
      active: pathname === '/report',
    },
    {
      label: 'Profile',
      icon: User,
      href: '/profile',
      active: pathname === '/profile',
    },
  ];

  // If admin, append Admin Panel navigation
  if (isAdmin) {
    navItems.push({
      label: 'Admin',
      icon: Shield,
      href: '/admin',
      active: pathname.startsWith('/admin'),
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-slate-800 bg-[#0f172a]/80 backdrop-blur-2xl shadow-2xl pb-safe px-2 py-1" id="bottom-navigation-bar">
      <div className="mx-auto flex h-14 w-full items-center justify-around gap-1.5">
        {navItems.map((item) => {
          const IconComp = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              id={`nav-tab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] px-2 py-1 rounded-xl transition-all duration-300 ${
                item.active 
                  ? 'text-emerald-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <IconComp className={`transition-all duration-300 ${item.active ? 'h-5 w-5 scale-110' : 'h-5 w-5'}`} />
              <span className={`text-[9px] tracking-wider uppercase transition-all duration-300 ${item.active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

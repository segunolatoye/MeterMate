'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, History, User, Shield } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md pb-safe" id="bottom-navigation-bar">
      <div className="mx-auto flex h-16 max-w-[430px] items-center justify-around px-2">
        {navItems.map((item) => {
          const IconComp = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              id={`nav-tab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                item.active 
                  ? 'text-emerald-400 font-bold scale-105' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <IconComp className="h-5 w-5" />
              <span className="text-[10px] tracking-wide font-medium uppercase">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

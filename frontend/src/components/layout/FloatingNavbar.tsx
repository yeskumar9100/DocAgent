'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: 'dashboard' },
  { href: '/chat', label: 'Chat', icon: 'forum' },
  { href: '/documents', label: 'Library', icon: 'folder_open' },
  { href: '/upload', label: 'Upload', icon: 'upload_file' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export function FloatingNavbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop =
            target === (document as any) ||
            target === document.documentElement ||
            target === document.body
              ? window.scrollY
              : target.scrollTop || 0;

          setIsScrolled(scrollTop >= 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <nav
      id="floating-nav"
      className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center liquid-glass border border-white/40 shadow-lg rounded-full transition-all duration-300 ease-out ${
        isScrolled
          ? 'py-1.5 px-2.5 gap-1.5 sm:gap-2 shadow-[0_8px_32px_rgba(70,72,212,0.12)]'
          : 'py-2 px-3 gap-2 sm:gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
      }`}
      style={{
        bottom: `calc(${isScrolled ? '1.25rem' : '1.5rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className={`group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ease-out select-none text-decoration-none ${
              isActive
                ? 'bg-[#8B5CF6] text-white shadow-[0_4px_14px_rgba(139,92,246,0.45)] scale-105'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 active:scale-95'
            }`}
          >
            <span
              className="material-symbols-outlined select-none transition-transform duration-200 group-hover:scale-110"
              style={{
                fontSize: '22px',
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {icon}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

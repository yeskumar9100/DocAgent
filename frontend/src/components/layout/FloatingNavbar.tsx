'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeProvider';
import { Sun, Moon } from 'lucide-react';

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
          // If scrolling window or container
          const scrollTop = target === (document as any) || target === document.documentElement || target === document.body
            ? window.scrollY
            : (target.scrollTop || 0);

          setIsScrolled(scrollTop >= 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Capture scrolling globally across any containers (e.g. overflow-y-auto elements)
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <nav
      id="floating-nav"
      className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center liquid-glass shadow-xl transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] border border-white/30 rounded-full ${
        isScrolled
          ? 'py-2 px-4 gap-4 shadow-[0_8px_32px_rgba(70,72,212,0.08)]'
          : 'py-3 px-6 gap-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)]'
      }`}
      style={{
        bottom: `calc(${isScrolled ? '2rem' : '1.5rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');

        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center justify-center transition-all duration-300 ease-out select-none text-decoration-none ${
              isActive ? 'text-[#8B5CF6] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {/* Icon Container with active-state violet highlight */}
            <div
              className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                isActive
                  ? 'bg-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-105'
                  : 'group-hover:bg-slate-100/60'
              }`}
            >
              <span 
                className="material-symbols-outlined select-none" 
                style={{ 
                  fontSize: '20px', 
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" 
                }}
              >
                {icon}
              </span>
            </div>

            {/* Label with layout animate behavior (expands on hover/active/expanded state) */}
            <span
              className={`font-sans text-[13px] tracking-wide font-semibold whitespace-nowrap transition-all duration-300 ease-out select-none ${
                isActive || !isScrolled
                  ? 'max-w-[80px] opacity-100 ml-2'
                  : 'max-w-0 opacity-0 overflow-hidden ml-0'
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
      {/* Quick theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="group flex items-center justify-center p-2 rounded-full transition-all duration-300 cursor-pointer"
        style={{
          background: isDark ? 'rgba(77,148,255,0.12)' : 'rgba(0,102,255,0.07)',
          border: isDark ? '1px solid rgba(77,148,255,0.25)' : '1px solid rgba(0,102,255,0.15)',
        }}
      >
        {isDark
          ? <Sun className="w-4 h-4" style={{ color: '#fbbf24' }} />
          : <Moon className="w-4 h-4" style={{ color: '#0066ff' }} />}
      </button>
    </nav>
  );
}

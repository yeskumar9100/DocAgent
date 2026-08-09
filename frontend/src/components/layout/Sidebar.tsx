'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Upload,
  MessageSquare,
  FolderOpen,
  Settings,
  FileText,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';

const NAV_ITEMS = [
  { href: '/upload', icon: Upload, label: 'Document Upload' },
  { href: '/documents', icon: FolderOpen, label: 'Document Library' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mode, user, logout, exitAsGuest } = useAuth();
  const isLoggedIn = mode === 'logged_in';

  const displayName = isLoggedIn && user ? user.name : 'Guest User';
  const displaySub  = isLoggedIn && user ? user.email : 'Free session';

  return (
    <aside
      className="flex flex-col w-[280px] h-full shrink-0"
      style={{
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.7)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-white/20">
          <img src="/logo.png" alt="DocAgent Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none tracking-tight" style={{ color: 'var(--color-accent)' }}>
            DocAgent
          </p>
          <p className="text-xs leading-none mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AI Assistant
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 p-4 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#424656',
                background: isActive ? '#0066ff' : 'transparent',
                boxShadow: isActive ? '0 4px 15px rgba(0, 102, 255, 0.2)' : 'none',
                transition: 'all 0.25s ease-in-out',
                textDecoration: 'none',
              }}
            >
              <Icon
                className="shrink-0"
                style={{ width: 18, height: 18, color: isActive ? '#ffffff' : '#64748b' }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.6)' }}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isLoggedIn ? '#0066ff' : '#94a3b8' }}
          >
            <User className="text-white" style={{ width: 16, height: 16 }} />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold leading-none truncate" style={{ color: '#0b1c30' }}>
              {displayName}
            </p>
            <p className="text-xs leading-none mt-1 truncate" style={{ color: '#64748b' }}>
              {displaySub}
            </p>
          </div>

          {/* Exit / Logout icon button */}
          <button
            id="sidebar-exit-btn"
            title={isLoggedIn ? 'Log out' : 'Exit session'}
            onClick={isLoggedIn ? logout : exitAsGuest}
            className="ml-auto p-1.5 rounded-lg cursor-pointer transition-all duration-200 group"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = isLoggedIn ? '#ef4444' : '#64748b'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

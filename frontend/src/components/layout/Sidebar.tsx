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
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/upload', icon: Upload, label: 'Document Upload' },
  { href: '/documents', icon: FolderOpen, label: 'Document Library' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

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
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.6)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: '#0066ff',
          }}
        >
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none tracking-tight" style={{ color: '#0050cb' }}>
            DocAgent
          </p>
          <p className="text-xs leading-none mt-1" style={{ color: '#64748b' }}>
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
                style={{
                  width: 18,
                  height: 18,
                  color: isActive ? '#ffffff' : '#64748b',
                }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div
        className="p-4"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.6)' }}
      >
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
            style={{ background: '#0066ff' }}
          >
            <User className="text-white" style={{ width: 16, height: 16 }} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold leading-none truncate" style={{ color: '#0b1c30' }}>
              DocAgent User
            </p>
            <p className="text-xs leading-none mt-1 truncate" style={{ color: '#64748b' }}>
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

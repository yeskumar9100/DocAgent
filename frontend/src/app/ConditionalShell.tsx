'use client';

import { usePathname } from 'next/navigation';
import { FloatingNavbar } from '@/components/layout/FloatingNavbar';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg-base)',
        backgroundImage: 'var(--shell-gradient)',
        backgroundAttachment: 'fixed',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        position: 'relative',
        transition: 'background 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Decorative Background Blurs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '350px',
          height: '350px',
          background: 'var(--blur-orb-1)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 0.5s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'var(--blur-orb-2)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 0.5s ease',
        }}
      />

      {/* Main app layout wrapper */}
      <div style={{ display: 'flex', width: '100%', height: '100%', zIndex: 1, position: 'relative' }}>
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            /* Reserve space at bottom for floating nav + safe-area gesture bar */
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {children}
        </main>
        <FloatingNavbar />
      </div>
    </div>
  );
}

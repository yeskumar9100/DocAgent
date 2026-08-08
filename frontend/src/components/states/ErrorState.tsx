'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-4 text-center">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertCircle className="w-7 h-7" style={{ color: 'var(--color-error)' }} />
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Error</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 380, lineHeight: 1.6 }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: '9999px',
            background: 'var(--color-bg-surface)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--glass-shadow)',
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-elevated)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent-border)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'none';
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
}

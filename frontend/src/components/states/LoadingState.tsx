'use client';

export function LoadingState({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            background: 'var(--color-bg-card)',
            backdropFilter: 'blur(40px)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            padding: '16px',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200/20 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200/60 rounded w-2/3" />
              <div className="h-3 bg-slate-200/60 rounded w-1/3" />
              <div className="h-2 bg-slate-200/60 rounded w-full mt-3" />
              <div className="h-2 bg-slate-200/60 rounded w-5/6" />
              <div className="h-2 bg-slate-200/60 rounded w-4/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div
      className={`${sizeMap[size]} rounded-full border-2 border-blue-600 border-t-transparent animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

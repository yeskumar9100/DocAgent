'use client';

import { useState, useEffect } from 'react';
import { getProviders, ProviderRecord } from '@/lib/api';
import { ProviderCard } from './ProviderCard';
import { LoadingSpinner } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_PROVIDERS = ['nvidia', 'openai', 'anthropic', 'google', 'custom'];

function SortableProviderCard({
  provider,
  onUpdate,
  onDelete,
}: {
  provider: ProviderRecord;
  onUpdate: (p: ProviderRecord) => void;
  onDelete: (name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: provider.provider_name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProviderCard
        provider={provider}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'light',  label: 'Light',  Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark',   label: 'Dark',   Icon: Moon },
];

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500"
          style={{
            background: isDark ? 'rgba(77,148,255,0.15)' : 'rgba(0,102,255,0.08)',
            border: isDark ? '1px solid rgba(77,148,255,0.3)' : '1px solid rgba(0,102,255,0.18)',
          }}
        >
          {isDark
            ? <Moon className="w-4 h-4" style={{ color: '#4d94ff' }} />
            : <Sun className="w-4 h-4" style={{ color: '#0066ff' }} />}
        </div>
        <div>
          <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Appearance</h4>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Choose your preferred theme</p>
        </div>
      </div>

      {/* 3-way pill selector */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: active ? 'var(--color-bg-card)' : 'transparent',
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                boxShadow: active ? 'var(--glass-shadow)' : 'none',
                border: active ? '1px solid var(--color-accent-border)' : '1px solid transparent',
                transform: active ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Live preview pill */}
      <p
        className="text-[10px] font-medium mt-3 text-center transition-all duration-300"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {theme === 'light' && '☀️ Light mode active'}
        {theme === 'dark'  && '🌙 Dark mode active'}
        {theme === 'system' && '🖥 Following system preference'}
      </p>
    </div>
  );
}

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProviders();
      setProviders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build full list: configured + unconfigured defaults
  const configuredNames = new Set(providers.map((p) => p.provider_name));
  const unconfiguredDefaults: ProviderRecord[] = DEFAULT_PROVIDERS
    .filter((name) => !configuredNames.has(name))
    .map((name, i) => ({
      provider_name: name,
      masked_key: '',
      is_enabled: false,
      is_fallback: false,
      priority_order: Math.min(90 + i, 99),
      status: 'not_configured' as const,
      backoff_remaining: 0,
    }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProviders((items) => {
      const oldIdx = items.findIndex((p) => p.provider_name === active.id);
      const newIdx = items.findIndex((p) => p.provider_name === over.id);
      return arrayMove(items, oldIdx, newIdx).map((p, i) => ({
        ...p,
        priority_order: i + 1,
      }));
    });
  };

  const handleUpdate = (updated: ProviderRecord) => {
    setProviders((prev) => {
      const exists = prev.some((p) => p.provider_name === updated.provider_name);
      if (exists) {
        return prev.map((p) => p.provider_name === updated.provider_name ? updated : p);
      }
      return [...prev, updated];
    });
  };

  const handleDelete = (name: string) => {
    setProviders((prev) => prev.filter((p) => p.provider_name !== name));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const connectedCount = providers.filter((p) => p.status === 'connected').length;

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="max-w-7xl mx-auto p-8 pb-28 animate-fade-in">
        {/* Header */}
        <header className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
            <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Configure your AI providers and RAG preferences</p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Left Column (AI Providers Configuration) - 65% */}
          <div className="flex-1 lg:w-3/5 space-y-6">
            {/* AI Providers Section */}
            <section className="glass-panel p-6 border border-white/10 rounded-4xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>AI Providers Routing</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 font-semibold">
                  {connectedCount} connected
                </span>
              </div>

              {/* Info Alert */}
              <div className="rounded-xl p-4 border mb-6 flex gap-3 text-xs leading-relaxed font-medium"
                style={{ background: 'var(--color-accent-bg)', borderColor: 'var(--color-accent-border)', color: 'var(--color-accent)' }}>
                <svg className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <p>
                  <strong>Fallback order:</strong> Providers are tried in priority order for LLM generation. If one rate-limits, the next is tried automatically. <strong>Embeddings are pinned</strong> — a document is always searched with the same provider that indexed it.
                </p>
              </div>

              {/* Drag-to-reorder list context */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={providers.map((p) => p.provider_name)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4 mb-8">
                    {providers.map((p) => (
                      <SortableProviderCard
                        key={p.provider_name}
                        provider={p}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Available Providers Section */}
              {unconfiguredDefaults.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Available Providers</h3>
                  <div className="space-y-4">
                    {unconfiguredDefaults.map((p) => (
                      <ProviderCard
                        key={p.provider_name}
                        provider={p}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column (Appearance + Diagnostics + Security) - 35% */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-6">

            {/* ── Appearance Card ── */}
            <AppearanceCard />

            {/* System Diagnostics Card */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>System Diagnostics</h4>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Decryption Key</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,211,153,0.2)' }}>Active</span>
                </div>
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Encryption Standard</span>
                  <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>AES-128-CBC</span>
                </div>
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Local Database</span>
                  <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>SQLite (aiosqlite)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Vector Dimension</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>1024 / 1536</span>
                </div>
              </div>
            </div>

            {/* About Section Card */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm">
              <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>Security & Privacy</h4>
              <p className="text-xs mb-3 leading-relaxed font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                DocAgent is built with a local-first, privacy-focused RAG architecture. API credentials are encrypted at rest using AES-128-CBC. Decryption keys live strictly in the backend execution environment memory and are never persisted in the database.
              </p>
              <p className="text-[10px] font-bold font-mono" style={{ color: 'var(--color-text-muted)' }}>v1.0.0 Phase 1 — NVIDIA-first RAG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

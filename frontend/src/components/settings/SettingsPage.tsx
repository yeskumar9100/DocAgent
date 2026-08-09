'use client';

import { useState, useEffect } from 'react';
import { getProviders, ProviderRecord } from '@/lib/api';
import { ProviderCard } from './ProviderCard';
import { LoadingSpinner } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAuth } from '@/context/AuthProvider';
import {
  Sun, Moon, Monitor, User, Mail, Shield, LogOut,
  LogIn, KeyRound, Cpu, ChevronRight, BadgeCheck,
} from 'lucide-react';
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

// ── Sortable wrapper ──────────────────────────────────────────────────────────
function SortableProviderCard({
  provider, onUpdate, onDelete,
}: {
  provider: ProviderRecord;
  onUpdate: (p: ProviderRecord) => void;
  onDelete: (name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: provider.provider_name,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <ProviderCard provider={provider} onUpdate={onUpdate} onDelete={onDelete} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ── Theme selector ────────────────────────────────────────────────────────────
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
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
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
      <p className="text-[10px] font-medium mt-3 text-center transition-all duration-300" style={{ color: 'var(--color-text-muted)' }}>
        {theme === 'light' && '☀️ Light mode active'}
        {theme === 'dark'  && '🌙 Dark mode active'}
        {theme === 'system' && '🖥 Following system preference'}
      </p>
    </div>
  );
}

// ── Account Section ───────────────────────────────────────────────────────────
function AccountSection() {
  const { mode, user, login, logout, exitAsGuest } = useAuth();
  const isLoggedIn = mode === 'logged_in';

  // Mock login form state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleMockLogin = () => {
    if (!formName.trim() || !formEmail.trim()) {
      setLoginError('Please fill in all fields.');
      return;
    }
    login({ name: formName.trim(), email: formEmail.trim() });
    setShowLoginForm(false);
    setLoginError('');
  };

  return (
    <div className="glass-panel rounded-[24px] border border-white/10 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-accent-bg)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-accent)', boxShadow: '0 4px 12px rgba(0,102,255,0.25)' }}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Account Details</h3>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {isLoggedIn ? 'Signed-in account' : 'Using as guest'}
          </p>
        </div>
        {isLoggedIn && (
          <span
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-success)', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            <BadgeCheck className="w-3 h-3" /> Verified
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {isLoggedIn && user ? (
          <>
            {/* User info rows */}
            <div className="space-y-3">
              <div
                className="flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-bg)' }}>
                  <User className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Full Name</p>
                  <p className="text-sm font-bold truncate mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{user.name}</p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-bg)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Email Address</p>
                  <p className="text-sm font-bold truncate mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{user.email}</p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.1)' }}>
                  <Shield className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Account Plan</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>Free Tier</p>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="settings-logout-btn"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer group"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Log Out
            </button>
          </>
        ) : (
          <>
            {/* Guest mode info */}
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(148,163,184,0.15)' }}>
                <User className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Guest User</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Not signed in — session is temporary</p>
              </div>
            </div>

            {/* Login form toggle */}
            {!showLoginForm ? (
              <button
                id="settings-login-btn"
                onClick={() => setShowLoginForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer"
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(0,102,255,0.25)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            ) : (
              <div className="space-y-3">
                {loginError && (
                  <p className="text-xs font-semibold text-red-500 px-1">{loginError}</p>
                )}
                <input
                  id="settings-login-name"
                  type="text"
                  placeholder="Your name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <input
                  id="settings-login-email"
                  type="email"
                  placeholder="Email address"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    id="settings-login-submit"
                    onClick={handleMockLogin}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200"
                    style={{ background: 'var(--color-accent)', color: '#fff', border: 'none' }}
                  >
                    Sign In
                  </button>
                  <button
                    id="settings-login-cancel"
                    onClick={() => { setShowLoginForm(false); setLoginError(''); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200"
                    style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Exit button for guests */}
            <button
              id="settings-exit-btn"
              onClick={exitAsGuest}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-text-muted)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              Exit Session
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────────────────────
export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { mode, user, logout, exitAsGuest } = useAuth();
  const isLoggedIn = mode === 'logged_in';

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
      return arrayMove(items, oldIdx, newIdx).map((p, i) => ({ ...p, priority_order: i + 1 }));
    });
  };

  const handleUpdate = (updated: ProviderRecord) => {
    setProviders((prev) => {
      const exists = prev.some((p) => p.provider_name === updated.provider_name);
      if (exists) return prev.map((p) => p.provider_name === updated.provider_name ? updated : p);
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

  if (error) return <ErrorState message={error} onRetry={load} />;

  const connectedCount = providers.filter((p) => p.status === 'connected').length;

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="max-w-7xl mx-auto p-8 pb-28 animate-fade-in">

        {/* ── Page Header ── */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
              <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Manage your account, AI providers and preferences
              </p>
            </div>
          </div>

          {/* ── Exit / Logout button in header ── */}
          <button
            id="settings-header-exit-btn"
            onClick={isLoggedIn ? logout : exitAsGuest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer"
            style={{
              background: isLoggedIn ? 'rgba(239,68,68,0.08)' : 'var(--color-bg-surface)',
              border: isLoggedIn ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--color-border)',
              color: isLoggedIn ? '#ef4444' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(-1px)';
              btn.style.opacity = '0.85';
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(0)';
              btn.style.opacity = '1';
            }}
          >
            {isLoggedIn
              ? <><LogOut className="w-4 h-4" /> Log Out</>
              : <><ChevronRight className="w-4 h-4 rotate-180" /> Exit</>
            }
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 w-full">

          {/* ── Left Column: API Keys Section (65%) ── */}
          <div className="flex-1 lg:w-3/5 space-y-6">
            <section className="glass-panel p-6 border border-white/10 rounded-4xl shadow-sm">

              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)' }}
                >
                  <KeyRound className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      API Keys &amp; Providers
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <Cpu className="w-3 h-3" /> {connectedCount} connected
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Configure and prioritise your LLM provider credentials
                  </p>
                </div>
              </div>

              {/* Info Alert */}
              <div
                className="rounded-xl p-4 border mb-6 flex gap-3 text-xs leading-relaxed font-medium"
                style={{ background: 'var(--color-accent-bg)', borderColor: 'var(--color-accent-border)', color: 'var(--color-accent)' }}
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p>
                  <strong>Fallback order:</strong> Providers are tried in priority order for LLM generation. If one rate-limits, the next is tried automatically. <strong>Embeddings are pinned</strong> — a document is always searched with the same provider that indexed it.
                </p>
              </div>

              {/* Drag-to-reorder configured providers */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={providers.map((p) => p.provider_name)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4 mb-8">
                    {providers.map((p) => (
                      <SortableProviderCard key={p.provider_name} provider={p} onUpdate={handleUpdate} onDelete={handleDelete} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Available Providers Section */}
              {unconfiguredDefaults.length > 0 && (
                <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    Available Providers
                  </h3>
                  <div className="space-y-4">
                    {unconfiguredDefaults.map((p) => (
                      <ProviderCard key={p.provider_name} provider={p} onUpdate={handleUpdate} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── Right Column: Account + Appearance + Diagnostics (35%) ── */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-6">

            {/* Account Details Section */}
            <AccountSection />

            {/* Appearance Card */}
            <AppearanceCard />

            {/* System Diagnostics */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>System Diagnostics</h4>
              <div className="space-y-3.5">
                {[
                  { label: 'Decryption Key', value: 'Active', highlight: true },
                  { label: 'Encryption Standard', value: 'AES-128-CBC' },
                  { label: 'Local Database', value: 'SQLite (aiosqlite)' },
                  { label: 'Vector Dimension', value: '1024 / 1536' },
                ].map(({ label, value, highlight }, i, arr) => (
                  <div
                    key={label}
                    className="flex justify-between items-center pb-2.5"
                    style={i < arr.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : {}}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    {highlight
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,211,153,0.2)' }}>{value}</span>
                      : <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Privacy */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm">
              <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>Security &amp; Privacy</h4>
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

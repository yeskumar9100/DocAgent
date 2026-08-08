'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getDocuments, getProviders, DocRecord, ProviderRecord } from '@/lib/api';
import {
  FileText, Cpu, Database, MessageSquare, Upload, RefreshCw,
  Wifi, WifiOff, AlertTriangle, ChevronRight, Clock, Sparkles,
  TrendingUp, Activity, Zap, FolderOpen, ArrowRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;         // Tailwind bg class for icon container
  trend?: 'up' | 'neutral';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(isoDate: string): string {
  const d = new Date(isoDate);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  connected: {
    label: 'Connected', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',
    icon: <Wifi className="w-3.5 h-3.5" />,
  },
  not_configured: {
    label: 'Not configured', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200',
    icon: <WifiOff className="w-3.5 h-3.5" />,
  },
  auth_error: {
    label: 'Auth error', color: 'text-red-700', bg: 'bg-red-50 border-red-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  error: {
    label: 'Error', color: 'text-red-700', bg: 'bg-red-50 border-red-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  rate_limited: {
    label: 'Rate limited', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  nvidia: 'NVIDIA AI', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini', custom: 'Custom',
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCardWidget({ card }: { card: StatCard }) {
  return (
    <div className="glass-panel rounded-[20px] p-5 flex flex-col gap-3 hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.accent} text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
          {card.icon}
        </div>
        {card.trend === 'up' && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
            <TrendingUp className="w-3 h-3" /> Live
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">{card.label}</p>
        {card.sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{card.sub}</p>}
      </div>
    </div>
  );
}

function ProviderRow({ provider }: { provider: ProviderRecord }) {
  const sm = STATUS_META[provider.status] || STATUS_META.not_configured;
  const label = PROVIDER_LABELS[provider.provider_name] || provider.provider_name;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100/60 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${provider.status === 'connected' ? 'bg-blue-600' : 'bg-slate-200'}`}>
          <Cpu className={`w-3.5 h-3.5 ${provider.status === 'connected' ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <span className="text-xs font-semibold text-slate-700">{label}</span>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${sm.bg} ${sm.color}`}>
        {sm.icon}
        {sm.label}
      </span>
    </div>
  );
}

function DocRow({ doc, index }: { doc: DocRecord; index: number }) {
  const ext = doc.original_filename?.split('.').pop()?.toUpperCase() ?? 'DOC';
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500'];
  const color = colors[index % colors.length];

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100/60 last:border-0 group hover:bg-white/40 rounded-lg px-2 -mx-2 transition-colors">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <span className="text-[8px] font-extrabold text-white">{ext.slice(0, 3)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{doc.original_filename}</p>
        <p className="text-[10px] text-slate-400 font-medium">
          {doc.chunk_count ?? 0} chunks
          {doc.created_at ? ` · ${timeAgo(doc.created_at)}` : ''}
        </p>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
        doc.status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
        doc.status === 'processing' ? 'bg-amber-50 text-amber-700' :
        'bg-slate-50 text-slate-500'
      }`}>
        {doc.status ?? 'ready'}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardPage() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' :
    greetingHour < 17 ? 'Good afternoon' :
    'Good evening';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsData, provData] = await Promise.all([
        getDocuments().catch(() => [] as DocRecord[]),
        getProviders().catch(() => [] as ProviderRecord[]),
      ]);
      setDocs(docsData);
      setProviders(provData);
      setLastRefreshed(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectedProviders = providers.filter(p => p.status === 'connected');
  const totalChunks = docs.reduce((sum, d) => sum + (d.chunk_count ?? 0), 0);
  const readyDocs = docs.filter(d => d.status === 'ready');
  const recentDocs = [...docs].sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  ).slice(0, 8);

  const stats: StatCard[] = [
    {
      label: 'Documents Indexed',
      value: fmt(readyDocs.length),
      sub: `${docs.length} total files`,
      icon: <FileText className="w-5 h-5" />,
      accent: 'bg-blue-600',
      trend: 'up',
    },
    {
      label: 'AI Providers Active',
      value: connectedProviders.length,
      sub: `${providers.length} configured`,
      icon: <Cpu className="w-5 h-5" />,
      accent: 'bg-violet-600',
    },
    {
      label: 'Total Chunks',
      value: fmt(totalChunks),
      sub: 'Vector embeddings stored',
      icon: <Database className="w-5 h-5" />,
      accent: 'bg-emerald-600',
    },
    {
      label: 'System Status',
      value: connectedProviders.length > 0 ? 'Online' : 'Setup needed',
      sub: connectedProviders.length > 0 ? 'RAG pipeline ready' : 'Add a provider key',
      icon: <Activity className="w-5 h-5" />,
      accent: connectedProviders.length > 0 ? 'bg-emerald-600' : 'bg-amber-500',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="max-w-7xl mx-auto p-6 pb-28 space-y-6 animate-fade-in">

        {/* ── Header ── */}
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">DocAgent</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{greeting} 👋</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* System status pill */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${
              connectedProviders.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectedProviders.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
              {connectedProviders.length > 0 ? 'RAG Pipeline Online' : 'Setup Required'}
            </div>

            {/* Refresh button */}
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl glass-panel hover:bg-white/60 transition-colors text-slate-500 hover:text-blue-600"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div className="glass-panel rounded-xl p-4 bg-red-50/80 border border-red-200 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button onClick={load} className="ml-auto text-xs font-bold text-red-600 hover:underline">Retry</button>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(card => (
              <StatCardWidget key={card.label} card={card} />
            ))}
          </div>
        </section>

        {/* ── Main Content: 2 columns ── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ── Left: Recent Documents (3/5) ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-panel rounded-[20px] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-800">Recent Documents</h2>
                </div>
                <Link
                  href="/documents"
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-100/60 animate-pulse" />
                  ))}
                </div>
              ) : recentDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7 text-blue-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No documents yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Upload your first PDF or document to get started</p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Documents
                  </Link>
                </div>
              ) : (
                <div>
                  {recentDocs.map((doc, i) => (
                    <DocRow key={doc.id} doc={doc} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Quick Actions Card ── */}
            <div className="glass-panel rounded-[20px] p-5">
              <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/upload"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-600/5 border border-blue-100 hover:bg-blue-600/10 hover:border-blue-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upload</p>
                    <p className="text-[10px] text-slate-500">Add new docs</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:text-blue-600 transition-colors" />
                </Link>

                <Link
                  href="/chat"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-violet-600/5 border border-violet-100 hover:bg-violet-600/10 hover:border-violet-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Chat</p>
                    <p className="text-[10px] text-slate-500">Ask AI about docs</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:text-violet-600 transition-colors" />
                </Link>

                <Link
                  href="/documents"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-600/5 border border-emerald-100 hover:bg-emerald-600/10 hover:border-emerald-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Library</p>
                    <p className="text-[10px] text-slate-500">Browse all docs</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:text-emerald-600 transition-colors" />
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-600/5 border border-slate-100 hover:bg-slate-600/10 hover:border-slate-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Cpu className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Settings</p>
                    <p className="text-[10px] text-slate-500">Manage providers</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:text-slate-600 transition-colors" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right: Provider Status (2/5) ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Provider Health Panel */}
            <div className="glass-panel rounded-[20px] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-violet-600" />
                  <h2 className="text-sm font-bold text-slate-800">AI Providers</h2>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                  connectedProviders.length > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${connectedProviders.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {connectedProviders.length}/{providers.length} connected
                </span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-100/60 animate-pulse" />
                  ))}
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-6">
                  <WifiOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No providers configured</p>
                  <Link href="/settings" className="text-xs text-blue-600 font-bold hover:underline mt-1 block">
                    Add a provider →
                  </Link>
                </div>
              ) : (
                <div>
                  {providers.map(p => (
                    <ProviderRow key={p.provider_name} provider={p} />
                  ))}
                </div>
              )}

              <Link
                href="/settings"
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white/60 hover:border-blue-200 hover:text-blue-600 transition-all"
              >
                Manage providers <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* RAG Pipeline Health */}
            <div className="glass-panel rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">RAG Pipeline</h2>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: 'Document Ingestion',
                    ok: docs.length > 0,
                    note: docs.length > 0 ? `${docs.length} docs loaded` : 'No docs uploaded',
                  },
                  {
                    label: 'Embedding Store',
                    ok: totalChunks > 0,
                    note: totalChunks > 0 ? `${fmt(totalChunks)} vectors` : 'No vectors indexed',
                  },
                  {
                    label: 'LLM Providers',
                    ok: connectedProviders.length > 0,
                    note: connectedProviders.length > 0 ? `${connectedProviders.length} active` : 'No providers',
                  },
                  {
                    label: 'Query Engine',
                    ok: readyDocs.length > 0 && connectedProviders.length > 0,
                    note: readyDocs.length > 0 && connectedProviders.length > 0 ? 'Ready' : 'Needs setup',
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span className="text-xs font-semibold text-slate-700">{row.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${row.ok ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {row.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Last refreshed */}
            <p className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Refreshed {timeAgo(lastRefreshed.toISOString())}
            </p>
          </div>
        </section>

        {/* ── Getting started banner if no docs ── */}
        {!loading && docs.length === 0 && (
          <section className="glass-panel rounded-[20px] p-6 border border-blue-100/60 bg-gradient-to-br from-blue-50/60 to-violet-50/60">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Get started with DocAgent</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  Upload documents, connect an AI provider, and start asking intelligent questions about your files.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/settings"
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white/70 transition-colors"
                >
                  Add Provider
                </Link>
                <Link
                  href="/upload"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload First Doc
                </Link>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

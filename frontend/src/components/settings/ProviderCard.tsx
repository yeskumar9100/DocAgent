'use client';

import { useState } from 'react';
import { ProviderRecord, upsertProvider, deleteProvider, testProviderConnection } from '@/lib/api';
import { Eye, EyeOff, RefreshCw, Trash2, Check, X, AlertTriangle, Wifi, WifiOff, CheckCircle2, Play, Cpu } from 'lucide-react';

interface ProviderCardProps {
  provider: ProviderRecord;
  onUpdate: (updated: ProviderRecord) => void;
  onDelete: (name: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

const PROVIDER_META: Record<string, { label: string; color: string; limit: string; rpm: number }> = {
  nvidia: { label: 'NVIDIA AI Catalog', color: 'text-blue-600', limit: '1,000 RPM (Standard Developer Tier)', rpm: 1000 },
  openai: { label: 'OpenAI', color: 'text-green-600', limit: '3 RPM (Free) / 3,000 RPM (Tier 1)', rpm: 3000 },
  anthropic: { label: 'Anthropic Claude', color: 'text-orange-600', limit: '5 RPM (Free) / 1,000 RPM (Tier 1)', rpm: 1000 },
  google: { label: 'Google Gemini', color: 'text-purple-600', limit: '15 RPM (Free Tier)', rpm: 15 },
  custom: { label: 'Custom Provider', color: 'text-gray-600', limit: 'Varies by provider endpoint', rpm: 60 },
};

const STATUS_CONFIG = {
  connected: { icon: Wifi, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', label: 'Connected' },
  not_configured: { icon: WifiOff, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', label: 'Not configured' },
  rate_limited: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200', label: 'Rate limited' },
  auth_error: { icon: X, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', label: 'Auth error' },
  error: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', label: 'Error' },
};

/** Safely extract a string from any error shape thrown by api.ts */
function toErrorString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.detail === 'string') return e.detail;
    if (typeof e.message === 'string') return e.message;
    return JSON.stringify(err);
  }
  return 'Something went wrong';
}

export function ProviderCard({ provider, onUpdate, onDelete, dragHandleProps }: ProviderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // Connection testing states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latency_ms: number } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const meta = PROVIDER_META[provider.provider_name] || PROVIDER_META.custom;
  const status = STATUS_CONFIG[provider.status] || STATUS_CONFIG.not_configured;
  const StatusIcon = status.icon;

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    setSaving(true);
    setError(null);
    setSavedOk(false);
    setTestResult(null);
    setTestError(null);
    try {
      const updated = await upsertProvider({
        provider_name: provider.provider_name,
        api_key: keyValue,
        is_fallback: provider.is_fallback,
        priority_order: provider.priority_order,
        base_url: provider.base_url,
        llm_model: provider.llm_model,
        embedding_model: provider.embedding_model,
      });
      onUpdate(updated);
      setIsEditing(false);
      setKeyValue('');
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err: unknown) {
      setError(toErrorString(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await testProviderConnection(provider.provider_name);
      setTestResult(res);
    } catch (err: unknown) {
      setTestError(toErrorString(err));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${meta.label} provider? Documents embedded with this provider will still be accessible.`)) return;
    try {
      await deleteProvider(provider.provider_name);
      onDelete(provider.provider_name);
    } catch (err: unknown) {
      alert(toErrorString(err));
    }
  };

  const handleFallbackToggle = async () => {
    if (!provider.masked_key) return;
    try {
      await upsertProvider({
        provider_name: provider.provider_name,
        api_key: '____KEEP____',
        is_fallback: !provider.is_fallback,
        priority_order: provider.priority_order,
      });
      onUpdate({ ...provider, is_fallback: !provider.is_fallback });
    } catch {
      // Silently fail preference toggle
    }
  };

  return (
    <div className="glass-panel p-6 relative min-w-0 w-full overflow-hidden">
      {/* Drag Handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 cursor-grab hover:text-gray-500"
          style={{ transition: 'color 0.15s ease' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8h16M4 16h16" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </div>
      )}

      {/* Content wrapper */}
      <div className={dragHandleProps ? 'pl-6' : 'pl-0'}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className={`text-base font-bold ${meta.color}`}>
              {meta.label}
            </h3>

            {/* Status badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}
            >
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {status.label}
              {provider.backoff_remaining > 0 && (
                <span className="ml-1">({Math.ceil(provider.backoff_remaining)}s)</span>
              )}
            </span>

            {/* Saved success toast */}
            {savedOk && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved!
              </span>
            )}
          </div>

          <span className="text-xs text-gray-400 font-mono">
            Priority {provider.priority_order}
          </span>
        </div>

        {/* Masked API Key or Edit Form */}
        {provider.masked_key && !isEditing ? (
          <div className="space-y-3 mb-4">
            {/* Wrap container nicely to avoid horizontal layout breaking */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0 w-full">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono flex items-center min-w-0 overflow-hidden justify-between">
                <span className="truncate">{provider.masked_key}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  {testing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-slate-500 fill-slate-500" />
                  )}
                  Test key
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-2 border border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors"
                >
                  Replace key
                </button>
              </div>
            </div>

            {/* Connection Test Results */}
            {(testResult || testError) && (
              <div className="p-3 rounded-xl border bg-slate-50/50 flex flex-col gap-2 animate-fade-in text-xs">
                {testResult && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">Latency / Response Speed</span>
                      <span className={`font-bold ${testResult.latency_ms < 300 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {testResult.latency_ms} ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">API Status</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${testResult.status === 'connected' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {testResult.status === 'connected' ? (
                          <>
                            <Wifi className="w-3.5 h-3.5 mr-0.5" />
                            Connected
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5 mr-0.5" />
                            Authentication Error
                          </>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {testError && (
                  <div className="flex items-start gap-2 text-red-700 font-medium">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span>{testError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Provider Limits display */}
            <div className="flex items-start gap-2 p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl text-[11px] text-slate-600">
              <Cpu className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-slate-700">Request Rate Limit Info</span>
                <span>{meta.limit}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Key Input Form */
          (isEditing || !provider.masked_key) && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={`Enter ${meta.label} API key...`}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 text-gray-900 pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setKeyValue('');
                        setError(null);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !keyValue.trim()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <Check className="w-4 h-4 text-gray-500" />
                  )}
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setKeyValue('');
                      setError(null);
                    }}
                    className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              {/* Error message — always a plain string now */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-red-700 leading-relaxed">{error}</p>
                </div>
              )}
            </div>
          )
        )}

        {/* Fallback Preference & Remove Options */}
        {provider.masked_key && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={provider.is_fallback}
                  onChange={handleFallbackToggle}
                  className="sr-only"
                />
                <div className={`block w-10 h-6 rounded-full transition ${provider.is_fallback ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`dot absolute top-1 bg-white w-4 h-4 rounded-full transition transform ${provider.is_fallback ? 'translate-x-5 left-1' : 'translate-x-0 left-1'}`}></div>
              </div>
              <div className="ml-3 text-sm font-semibold text-gray-700">
                Enable as automatic fallback provider
              </div>
            </label>

            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

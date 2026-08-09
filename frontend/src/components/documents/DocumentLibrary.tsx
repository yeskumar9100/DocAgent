'use client';

import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument, DocRecord } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';

export function DocumentLibrary() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => d.id)));
    }
  };

  const handleDelete = async (doc: DocRecord) => {
    if (!confirm(`Are you sure you want to delete ${doc.original_filename}?`)) {
      return;
    }
    setDeleting((prev) => {
      const next = new Set(prev);
      next.add(doc.id);
      return next;
    });
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const handleChatWithSelected = () => {
    const ids = Array.from(selected);
    const names: Record<number, string> = {};
    docs.forEach((d) => {
      if (selected.has(d.id)) {
        names[d.id] = d.original_filename;
      }
    });
    sessionStorage.setItem('chatDocIds', JSON.stringify(ids));
    sessionStorage.setItem('chatDocNames', JSON.stringify(names));
    router.push('/chat');
  };

  const handleChatWithOne = (doc: DocRecord) => {
    sessionStorage.setItem('chatDocIds', JSON.stringify([doc.id]));
    sessionStorage.setItem('chatDocNames', JSON.stringify({ [doc.id]: doc.original_filename }));
    router.push('/chat');
  };

  const docCount = docs.length;
  const totalChunks = docs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  const totalSize = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Header / Toolbar */}
      <header className="px-8 py-6 flex justify-between items-end flex-shrink-0 z-20">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Document Library</h2>
          <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {loading ? 'Loading…' : `${docCount} document${docCount !== 1 ? 's' : ''}${selected.size > 0 ? ` · ${selected.size} selected` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={handleChatWithSelected}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              <svg className="h-4 w-4 text-white/90" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9z" clipRule="evenodd" />
              </svg>
              Chat with {selected.size} doc{selected.size !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={load}
            className="p-2.5 rounded-xl bg-white/60 border border-white/80 text-slate-500 hover:text-slate-800 hover:bg-white/80 shadow-sm transition-all backdrop-blur-md"
            aria-label="Refresh documents"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Content Area (Scrollable with split layout) */}
      {/* pb-safe = nav bar height (~52px) + bottom-6 gap (24px) + safe-area + extra clearance = ~140px */}
      <div className="flex-1 px-4 sm:px-8 overflow-y-auto" style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 animate-fade-in">
          
          {/* Left Column (Documents List) - 75% */}
          <div className="flex-1 lg:w-3/4">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="glass-card rounded-3xl h-20 animate-pulse border border-white/50"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
                <p className="text-red-600 font-semibold text-sm">{error}</p>
                <button onClick={load} className="px-4 py-2 bg-white/60 border border-white/80 text-slate-500 hover:text-slate-800 rounded-xl font-semibold backdrop-blur-md shadow-sm">
                  Retry
                </button>
              </div>
            ) : docs.length === 0 ? (
              <div className="glass-card rounded-4xl w-full p-12 flex flex-col items-center gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center border border-white/40">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" fillRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">No documents yet</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Upload your first document to get started</p>
                </div>
                <button
                  onClick={() => router.push('/upload')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md border-none"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              /* Document List Container (Glass Card) */
              <div className="glass-card rounded-4xl w-full p-2 flex flex-col" style={{ border: '1px solid var(--color-border)' }}>

                {/* ── Table Header: hidden on mobile, shown sm+ ── */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_100px_130px_130px_160px] gap-3 px-4 py-4 items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="w-5 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.size === docs.length}
                      onChange={toggleAll}
                      className="form-checkbox h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 bg-white/50 cursor-pointer"
                    />
                  </div>
                  <div>Name</div>
                  <div>Size</div>
                  <div>Status</div>
                  <div>Uploaded</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Mobile select-all row */}
                <div className="flex sm:hidden items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <input
                    type="checkbox"
                    checked={selected.size === docs.length}
                    onChange={toggleAll}
                    className="form-checkbox h-4 w-4 rounded border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select All</span>
                </div>

                {/* Table Body */}
                <div className="flex flex-col gap-1.5">
                  {docs.map((doc) => {
                    const isSelected = selected.has(doc.id);
                    const isDeleting = deleting.has(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleSelect(doc.id)}
                        className={`transition-all border cursor-pointer rounded-3xl ${
                          isSelected ? 'border-blue-400/30 shadow-sm' : 'border-transparent'
                        }`}
                        style={{
                          background: isSelected ? 'var(--color-bg-card-hover)' : 'var(--glass-bg-card)',
                          opacity: isDeleting ? 0.4 : 1,
                          pointerEvents: isDeleting ? 'none' : 'auto',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                        }}
                      >
                        {/* ── DESKTOP ROW (sm+): original grid layout ── */}
                        <div className="hidden sm:grid grid-cols-[auto_1fr_100px_130px_130px_160px] gap-3 px-4 py-4 items-center">
                          {/* Checkbox */}
                          <div className="w-5 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)}
                              className="form-checkbox h-4 w-4 rounded border-slate-300 bg-white/80 cursor-pointer" />
                          </div>
                          {/* File name + icon */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500 border border-blue-100 shadow-sm">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586a2 2 0 011.414.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-semibold text-slate-800 truncate" title={doc.original_filename}>{doc.original_filename}</h3>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">{doc.embedding_provider}</p>
                            </div>
                          </div>
                          {/* Size */}
                          <div className="text-sm text-slate-600 font-medium">{formatSize(doc.file_size)}</div>
                          {/* Status */}
                          <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold status-badge">
                              {doc.status === 'ready' ? 'Processed' : doc.status === 'processing' ? 'Processing' : 'Error'}
                            </span>
                            {doc.status === 'ready' && <p className="text-[11px] text-slate-500 mt-1 ml-1 font-medium">{doc.chunk_count} chunks</p>}
                          </div>
                          {/* Uploaded */}
                          <div className="text-sm text-slate-600 font-medium">{formatDate(doc.created_at)}</div>
                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleChatWithOne(doc)} disabled={doc.status !== 'ready'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border"
                              style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)' }}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Chat
                            </button>
                            <button onClick={() => handleDelete(doc)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Delete">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* ── MOBILE CARD (< sm): stacked layout, no grid overflow ── */}
                        <div className="flex sm:hidden items-start gap-3 px-4 py-4">
                          {/* Checkbox — fixed width, never shrinks */}
                          <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)}
                              className="form-checkbox h-4 w-4 rounded border-slate-300 bg-white/80 cursor-pointer" />
                          </div>

                          {/* File icon — fixed size, never shrinks */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586a2 2 0 011.414.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>

                          {/* Text content — takes remaining space, truncates properly */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 truncate" title={doc.original_filename}>
                              {doc.original_filename}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{doc.embedding_provider}</p>
                            {/* Meta row: size · status · time */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                              <span className="text-[11px] text-slate-500 font-medium">{formatSize(doc.file_size)}</span>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold status-badge">
                                {doc.status === 'ready' ? 'Processed' : doc.status === 'processing' ? 'Processing' : 'Error'}
                              </span>
                              {doc.status === 'ready' && (
                                <span className="text-[11px] text-slate-400 font-medium">{doc.chunk_count} chunks</span>
                              )}
                              <span className="text-slate-300">·</span>
                              <span className="text-[11px] text-slate-500 font-medium">{formatDate(doc.created_at)}</span>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleChatWithOne(doc)}
                                disabled={doc.status !== 'ready'}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                                style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)' }}
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Chat
                              </button>
                              <button
                                onClick={() => handleDelete(doc)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Delete"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Library Stats & RAG Guide) - 25% */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* Library Overview Card */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Library Overview</h4>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Files</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{docCount}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Size</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatSize(totalSize)}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Chunks</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalChunks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Store Type</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>FAISS Index</span>
                </div>
              </div>
            </div>

            {/* Quick RAG Guide Card */}
            <div className="glass-panel rounded-[24px] p-6 border border-white/10 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>RAG Quick Start</h4>
              <div className="space-y-4">
                {[[
                  '1', 'Upload PDF, TXT or DOCX files in the Upload page.'
                ],[
                  '2', 'Wait for background indexing (chunk creation & embeddings) to finish.'
                ],[
                  '3', 'Select target documents here using the checkboxes.'
                ],[
                  '4', 'Click Chat with Selected to query documents simultaneously with source citations.'
                ]].map(([num, text]) => (
                  <div key={num} className="flex gap-3">
                    <div
                      className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }}
                    >{num}</div>
                    <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--color-text-secondary)' }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

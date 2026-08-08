'use client';

import { useState } from 'react';
import { UploadArea } from '@/components/upload/UploadArea';
import { DocRecord } from '@/lib/api';
import { MessageSquare, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UploadPageClient() {
  const [recentUploads, setRecentUploads] = useState<DocRecord[]>([]);
  const router = useRouter();

  const handleSuccess = (doc: DocRecord) => {
    setRecentUploads((prev) => [doc, ...prev].slice(0, 5));
  };

  const handleChatWith = (ids: number[], names: Record<number, string>) => {
    sessionStorage.setItem('chatDocIds', JSON.stringify(ids));
    sessionStorage.setItem('chatDocNames', JSON.stringify(names));
    router.push('/chat');
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Header */}
      <header className="px-8 py-6 flex justify-between items-end flex-shrink-0 z-20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl" style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-border)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--color-accent)' }}>
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Upload Documents</h2>
            <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Add PDFs, TXT or DOCX files to your knowledge base</p>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 px-8 pb-28 overflow-y-auto">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 animate-fade-in">
          {/* Left Column (Upload + Tips) - 60% */}
          <div className="flex-1 lg:w-3/5 space-y-6">
            <UploadArea onUploadSuccess={handleSuccess} />

            {/* Tips Section */}
            <div className="glass-surface rounded-[24px] p-6 border" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="font-bold mb-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>Tips for best results</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>PDFs with selectable text work best — scanned images may have lower accuracy</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Larger documents are automatically chunked into searchable segments</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Each document is indexed once — you can chat with multiple docs simultaneously</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column (Recent Uploads & Storage Diagnostics) - 40% */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
            {/* Storage & Indexing Diagnostics */}
            <div className="glass-panel rounded-[24px] p-6 border shadow-sm flex flex-col gap-4" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Upload Status & Settings</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Max File Size</p>
                  <p className="text-xs font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>25 MB</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Vector Store</p>
                  <p className="text-xs font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>FAISS Index</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Encryption</p>
                  <p className="text-xs font-bold mt-1" style={{ color: 'var(--color-success)' }}>Active</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>RAG Chunk Size</p>
                  <p className="text-xs font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>1000 chars</p>
                </div>
              </div>
            </div>

            {/* Recently Uploaded List */}
            <div className="glass-panel rounded-[24px] p-6 border shadow-sm flex flex-col gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Recent Uploads ({recentUploads.length})</h4>
              
              {recentUploads.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Uploaded files in this session will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {recentUploads.map((doc) => (
                    <div
                      key={doc.id}
                      className="border rounded-xl p-3.5 flex items-center gap-3 shadow-sm transition-colors"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--color-success)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }} title={doc.original_filename}>
                          {doc.original_filename}
                        </p>
                        <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {doc.chunk_count} chunks · {doc.embedding_provider}
                        </p>
                      </div>
                      <button
                        onClick={() => handleChatWith([doc.id], { [doc.id]: doc.original_filename })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold border-none cursor-pointer transition-colors shadow-sm"
                      >
                        <MessageSquare style={{ width: 11, height: 11 }} />
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

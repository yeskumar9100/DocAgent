'use client';

import { useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useRouter } from 'next/navigation';
import { FolderOpen } from 'lucide-react';

export function ChatPageClient() {
  const [documentIds, setDocumentIds] = useState<number[]>([]);
  const [documentNames, setDocumentNames] = useState<Record<number, string>>({});
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const ids = JSON.parse(sessionStorage.getItem('chatDocIds') || '[]');
      const names = JSON.parse(sessionStorage.getItem('chatDocNames') || '{}');
      setDocumentIds(ids);
      setDocumentNames(names);
    } catch {
      setDocumentIds([]);
      setDocumentNames({});
    }
    setLoaded(true);
  }, []);

  // Don't flash the empty state before session storage is read
  if (!loaded) return null;

  if (documentIds.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center animate-fade-in"
        style={{ background: 'transparent' }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: 'rgba(0, 102, 255, 0.08)',
            border: '1px solid rgba(0, 102, 255, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FolderOpen style={{ width: 32, height: 32, color: '#0066ff' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            No documents selected
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, lineHeight: 1.6, fontWeight: 500 }}>
            Go to the Document Library, select the documents you want to chat about, then come back here.
          </p>
        </div>
        <button
          id="open-library-btn"
          onClick={() => router.push('/documents')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow transition cursor-pointer"
        >
          <FolderOpen style={{ width: 16, height: 16 }} />
          Open Document Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ChatWindow documentIds={documentIds} documentNames={documentNames} />
    </div>
  );
}

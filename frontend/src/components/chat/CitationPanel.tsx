'use client';

import { Citation } from '@/lib/api';
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useState } from 'react';

interface CitationPanelProps {
  citations: Citation[];
  isLoading?: boolean;
}

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const preview = citation.text.slice(0, 120);
  const isLong = citation.text.length > 120;

  return (
    <div className="glass-card rounded-xl p-3 flex flex-col gap-2 group">
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/40 text-violet-300 text-xs flex items-center justify-center font-medium">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-violet-400 shrink-0" />
            <p className="text-xs text-violet-300 font-medium truncate">{citation.filename}</p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Page {citation.page}</p>
        </div>
        <span className="text-xs text-slate-600 font-mono shrink-0">
          {(citation.score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Text excerpt */}
      <p className="text-xs text-slate-300 leading-relaxed">
        {expanded ? citation.text : preview}
        {isLong && !expanded && '…'}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors self-start"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function CitationPanel({ citations, isLoading }: CitationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <BookOpen className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Sources</h2>
        {citations.length > 0 && (
          <span className="ml-auto text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full">
            {citations.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-3 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-2 bg-white/10 rounded w-full mb-1" />
                <div className="h-2 bg-white/10 rounded w-5/6" />
              </div>
            ))}
          </>
        ) : citations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">
              Source excerpts will appear here after you ask a question.
            </p>
          </div>
        ) : (
          citations.map((c, i) => (
            <CitationCard key={`${c.document_id}-${c.chunk_index}`} citation={c} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

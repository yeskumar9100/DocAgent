'use client';

import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  chips?: string[];
  onChipClick?: (text: string) => void;
  disabled?: boolean;
}

export function EmptyState({ chips = [], onChipClick, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-center">
      {/* Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20
          border border-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-violet-400" />
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-3xl bg-violet-600/20 blur-xl -z-10" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Ask anything about your docs
        </h2>
        <p className="text-slate-400 text-sm max-w-sm">
          {disabled
            ? 'Go to the Document Library and select documents to start chatting.'
            : 'Select a question below or type your own to get started.'}
        </p>
      </div>

      {/* Suggestion chips */}
      {chips.length > 0 && !disabled && (
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick?.(chip)}
              className="px-4 py-2 rounded-full text-sm border border-violet-500/30
                bg-violet-600/10 text-violet-300
                hover:bg-violet-600/25 hover:border-violet-400/50
                transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

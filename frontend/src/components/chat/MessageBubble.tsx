'use client';

import { AskResponse, Citation } from '@/lib/api';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  provider_used?: string;
  model_used?: string;
  isLoading?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      <div
        className="shrink-0 w-8.5 h-8.5 rounded-full flex items-center justify-center"
        style={
          isUser
            ? { background: 'var(--color-primary)', color: 'white', boxShadow: '0 4px 12px var(--color-primary-glow)' }
            : { background: 'var(--color-accent-bg)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }
        }
      >
        {isUser ? <User style={{ width: 16, height: 16 }} /> : <Bot style={{ width: 16, height: 16 }} />}
      </div>

      {/* Bubble */}
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
        {message.isLoading ? (
          <ThinkingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none prose-p:my-1 prose-a:font-semibold"
            style={{
              color: 'var(--color-text-primary)',
            }}
          >
            <style jsx global>{`
              .prose h1, .prose h2, .prose h3, .prose h4 { color: var(--color-accent) !important; }
              .prose a { color: var(--color-accent) !important; }
              .prose code { background: var(--color-bg-surface) !important; color: var(--color-text-primary) !important; border-radius: 4px; padding: 2px 4px; }
              .prose pre { background: var(--color-bg-card) !important; border: 1px solid var(--color-border) !important; color: var(--color-text-primary) !important; }
            `}</style>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Model attribution */}
        {!isUser && !message.isLoading && message.model_used && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
              via {message.provider_used} · {message.model_used}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

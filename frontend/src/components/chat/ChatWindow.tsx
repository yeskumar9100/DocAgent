'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { askQuestion, Citation, getDocumentPages } from '@/lib/api';
import { Message, MessageBubble } from './MessageBubble';
import { Trash2, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  documentIds: number[];
  documentNames: Record<number, string>;
}

const SUGGESTION_CHIPS = [
  'Summarize this document',
  'What are the key terms?',
  'List the main conclusions',
  'What methodology was used?',
  'Identify any risks mentioned',
];

export function ChatWindow({ documentIds, documentNames }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Outline states
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [outlineTab, setOutlineTab] = useState<'sections' | 'pages'>('sections');
  const [docPages, setDocPages] = useState<number[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load real page numbers when tabs switch to 'pages' or on mount
  useEffect(() => {
    if (documentIds.length === 0) return;
    const firstDocId = documentIds[0];
    setPagesLoading(true);
    getDocumentPages(firstDocId)
      .then(setDocPages)
      .catch(() => setDocPages([1]))
      .finally(() => setPagesLoading(false));
  }, [documentIds]);

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || isLoading) return;
      if (documentIds.length === 0) return;

      setInput('');
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: question,
      };
      const thinkingMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '',
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setIsLoading(true);
      setCurrentCitations([]);

      try {
        const response = await askQuestion(question, documentIds);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingMsg.id
              ? {
                  ...m,
                  content: response.answer,
                  citations: response.citations,
                  provider_used: response.provider_used,
                  model_used: response.model_used,
                  isLoading: false,
                }
              : m
          )
        );
        setCurrentCitations(response.citations);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingMsg.id
              ? { ...m, content: `❌ ${errMsg}`, isLoading: false }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [documentIds, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentCitations([]);
  };

  const docCount = Object.keys(documentNames).length;
  const firstDocName = Object.values(documentNames)[0] || 'Document';

  // Generate dynamic outline sections
  const getOutlineSections = (docName: string) => {
    const lower = docName.toLowerCase();
    if (lower.includes('resume') || lower.includes('cv') || lower.includes('biodata')) {
      return [
        { title: 'Contact & Header Info', icon: 'person', query: 'What is the contact information in this document?' },
        { title: 'Professional Summary', icon: 'description', query: 'Provide a brief summary of the candidate\'s profile.' },
        { title: 'Work Experience', icon: 'work', query: 'Detail the professional experience and key roles listed in this resume.' },
        { title: 'Projects Showcase', icon: 'code', query: 'What technical projects did this candidate work on?' },
        { title: 'Education & Credentials', icon: 'school', query: 'What are the education credentials and certifications of the candidate?' },
      ];
    }
    return [
      { title: 'Executive Summary', icon: 'summarize', query: 'Provide a brief executive summary of this document.' },
      { title: 'Context & Background', icon: 'info', query: 'What is the background context and scope of this document?' },
      { title: 'Key Methods & Findings', icon: 'analytics', query: 'What are the primary findings or key methods outlined here?' },
      { title: 'Identified Risks & Gaps', icon: 'warning', query: 'What risks, limitations, or gaps are highlighted in this document?' },
      { title: 'Conclusions & Next Steps', icon: 'check_circle', query: 'What are the conclusions and recommended next steps?' },
    ];
  };

  const outlineSections = getOutlineSections(firstDocName);

  // Real pages loaded from the document's FAISS index
  const pages = docPages.map((num) => ({
    num,
    query: `Summarize page ${num} of this document.`,
  }));

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* BEGIN: Collapsible Document Outline Panel (Left side) */}
      <aside 
        className={`glass-panel border-r border-white/50 relative z-20 flex flex-col transition-all duration-300 ease-out select-none ${
          outlineOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0 opacity-0'
        }`}
      >
        <div className="p-4 border-b border-white/50 flex flex-col gap-3">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Document Outline</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium truncate" title={firstDocName}>
              {firstDocName}
            </p>
          </div>
          
          {/* Segmented control tabs */}
          <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setOutlineTab('sections')}
              className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-colors ${
                outlineTab === 'sections' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sections
            </button>
            <button
              onClick={() => setOutlineTab('pages')}
              className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-colors ${
                outlineTab === 'pages' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pages
            </button>
          </div>
        </div>

        {/* Tab contents */}
        <div className="flex-1 overflow-y-auto p-3">
          {outlineTab === 'sections' ? (
            <div className="flex flex-col gap-1">
              {outlineSections.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(sec.query)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-500/10 transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <span className="material-symbols-outlined transition-colors" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>
                    {sec.icon}
                  </span>
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {sec.title}
                  </span>
                </button>
              ))}
            </div>
          ) : pagesLoading ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading pages…</span>
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs font-medium text-center px-2">
              No pages found in this document.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              {pages.map((page) => (
                <button
                  key={page.num}
                  onClick={() => sendMessage(page.query)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-white/40 hover:bg-white/80 hover:border-blue-300 transition-all group"
                >
                  {/* Page Thumbnail (visual placeholder lines) */}
                  <div className="w-full aspect-[3/4] rounded-lg border border-slate-200/80 bg-white shadow-sm p-1.5 flex flex-col gap-1 overflow-hidden select-none relative">
                    {/* Page number badge */}
                    <span className="absolute top-1 right-1 bg-blue-50 text-blue-700 text-[9px] font-bold rounded px-1 leading-tight border border-blue-200">
                      {page.num}
                    </span>
                    <div className="h-1 bg-slate-300 rounded w-4/5"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-full"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-full"></div>
                    <div className="h-0.5 bg-slate-200 rounded w-1/2 mt-auto"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-700 font-mono">
                    Page {page.num}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
      {/* END: Document Outline Panel */}

      {/* ── Chat pane (70%) ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* BEGIN: Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b glass-panel shrink-0 z-20" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            {/* Outline sidebar toggle */}
            <button
              onClick={() => setOutlineOpen(!outlineOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors mr-2 flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
              title={outlineOpen ? "Hide Outline" : "Show Outline"}
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: '20px' }}>
                {outlineOpen ? 'menu_open' : 'menu'}
              </span>
            </button>

            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Chatting with <span className="font-bold animate-pulse" style={{ color: 'var(--color-accent)' }}>{docCount}</span> document{docCount !== 1 ? 's' : ''}
            </span>
            {Object.values(documentNames)
              .slice(0, 2)
              .map((name) => (
                <div
                  key={name}
                  className="glass-pill px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm border"
                  style={{
                    background: 'var(--color-accent-bg)',
                    color: 'var(--color-accent)',
                    borderColor: 'var(--color-accent-border)',
                  }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M4 4a2 2 0 012-2h4.586a2 2 0 011.414.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" fillRule="evenodd"></path>
                  </svg>
                  {name.length > 20 ? name.slice(0, 20) + '…' : name}
                </div>
              ))}
            {Object.keys(documentNames).length > 2 && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                +{Object.keys(documentNames).length - 2} more
              </span>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-colors text-sm font-semibold cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              Clear Chat
            </button>
          )}
        </header>
        {/* END: Top Header */}

        {/* Messages / Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 relative">
          {messages.length === 0 ? (
            /* Empty State / Suggestions */
            <div className="flex-1 flex flex-col items-center justify-start pt-12 max-w-3xl mx-auto w-full gap-6 animate-fade-in animate-slide-up">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-2 border"
                style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)' }}
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Ask about your documents</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Select a section from the outline, a suggestion chip, or type below</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="glass-button px-5 py-2.5 rounded-full text-sm font-semibold focus:outline-none focus:ring-2"
                    style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BEGIN: Floating Input Area */}
        <div
          className="p-6 pt-0 pb-24 shrink-0"
          style={{ background: 'linear-gradient(to top, var(--color-bg-base) 60%, transparent)' }}
        >
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 rounded-2xl blur-md transition-all" style={{ background: 'var(--color-accent-glow)', opacity: 0.5 }}></div>
            <div className="relative glass-input rounded-2xl p-2 flex items-end gap-2 shadow-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  documentIds.length === 0
                    ? 'Select documents from the library to start chatting…'
                    : 'Ask a question about your documents…'
                }
                disabled={isLoading || documentIds.length === 0}
                rows={1}
                className="w-full bg-transparent border-none resize-none focus:ring-0 placeholder-slate-400 p-3 max-h-32 min-h-[48px] focus:outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim() || documentIds.length === 0}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all mb-1 mr-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: 'var(--color-accent-bg)',
                  border: '1px solid var(--color-accent-border)',
                  color: 'var(--color-accent)',
                }}
                aria-label="Send message"
              >
                <svg className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </div>
        {/* END: Floating Input Area */}
      </div>

      {/* BEGIN: Citations Sidebar (30%) */}
      <aside className="w-80 flex-shrink-0 glass-panel border-l relative z-20 flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-5 border-b animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Citations</h3>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Sources referenced by the AI response.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {currentCitations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {isLoading
                  ? 'Retrieving sources…'
                  : 'Citations will appear here after you ask a question.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {currentCitations.map((c, i) => (
                <div key={i} className="citation-card animate-fade-in">
                  <p
                    className="text-xs font-bold mb-1.5 overflow-hidden text-overflow-ellipsis whitespace-nowrap font-mono"
                    style={{ color: 'var(--color-accent)' }}
                    title={`${c.filename} — Page ${c.page}`}
                  >
                    {c.filename} — Page {c.page}
                  </p>
                  <p className="text-xs leading-relaxed italic" style={{ color: 'var(--color-text-secondary)' }}>
                    {c.text.length > 220 ? c.text.slice(0, 220) + '…' : c.text}
                  </p>
                  <div className="flex items-center justify-end mt-2">
                    <span
                      className="text-[10px] rounded px-1.5 py-0.5 font-mono border"
                      style={{
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-bg-surface)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      score: {c.score.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      {/* END: Citations Sidebar */}
    </div>
  );
}

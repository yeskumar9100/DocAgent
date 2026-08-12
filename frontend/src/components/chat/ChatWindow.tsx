'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { askQuestion, Citation, getDocumentPages } from '@/lib/api';
import { Message, MessageBubble } from './MessageBubble';
import { Trash2, Loader2, BookOpen, X, FileText, ChevronRight } from 'lucide-react';

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

  // Responsive state detection
  const [isMobile, setIsMobile] = useState(false);

  // Sidebars open/closed states
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [citationsOpen, setCitationsOpen] = useState(false);

  const [outlineTab, setOutlineTab] = useState<'sections' | 'pages'>('sections');
  const [docPages, setDocPages] = useState<number[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  // Detect screen size on mount & resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setOutlineOpen(false);
        setCitationsOpen(false);
      } else {
        setOutlineOpen(true);
        setCitationsOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-open citations panel when new citations arrive (on desktop) or show notification
  useEffect(() => {
    if (currentCitations.length > 0 && !isMobile) {
      setCitationsOpen(true);
    }
  }, [currentCitations, isMobile]);

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
      // Auto-close sidebars on mobile when user sends a message so chat is clear
      if (isMobile) {
        setOutlineOpen(false);
        setCitationsOpen(false);
      }

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
    [documentIds, isLoading, isMobile]
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

  // Real pages loaded from document
  const pages = docPages.map((num) => ({
    num,
    query: `Summarize page ${num} of this document.`,
  }));

  // Render function for Outline Content
  const renderOutlineContent = () => (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Document Outline</h3>
          <p className="text-[11px] mt-0.5 font-medium truncate" style={{ color: 'var(--color-text-muted)' }} title={firstDocName}>
            {firstDocName}
          </p>
        </div>
        {isMobile && (
          <button
            onClick={() => setOutlineOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Segmented control tabs */}
      <div className="p-3 pb-0">
        <div className="flex bg-slate-500/10 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setOutlineTab('sections')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
              outlineTab === 'sections'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sections
          </button>
          <button
            onClick={() => setOutlineTab('pages')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
              outlineTab === 'pages'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
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
                <span className="material-symbols-outlined transition-colors shrink-0" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
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
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group cursor-pointer"
              >
                <div className="w-full aspect-[3/4] rounded-lg border border-white/10 bg-slate-800/50 shadow-sm p-1.5 flex flex-col gap-1 overflow-hidden select-none relative">
                  <span className="absolute top-1 right-1 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded px-1 leading-tight border border-blue-500/30">
                    {page.num}
                  </span>
                  <div className="h-1 bg-slate-600 rounded w-4/5"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-full"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-2/3"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-5/6"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-full"></div>
                  <div className="h-0.5 bg-slate-700 rounded w-1/2 mt-auto"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400 font-mono">
                  Page {page.num}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render function for Citations Content
  const renderCitationsContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Citations</h3>
          <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Sources referenced by AI response
          </p>
        </div>
        {isMobile && (
          <button
            onClick={() => setCitationsOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentCitations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {isLoading
                ? 'Retrieving source citations…'
                : 'Citations will appear here after you ask a question.'}
            </p>
          </div>
        ) : (
          currentCitations.map((c, i) => (
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
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-transparent relative">

      {/* ── MOBILE BACKDROP OVERLAY ── */}
      {isMobile && (outlineOpen || citationsOpen) && (
        <div
          onClick={() => {
            setOutlineOpen(false);
            setCitationsOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        />
      )}

      {/* ── DESKTOP OUTLINE SIDEBAR (md+) ── */}
      {!isMobile && (
        <aside
          className={`glass-panel border-r relative z-20 flex flex-col transition-all duration-300 ease-out ${
            outlineOpen ? 'w-64 opacity-100' : 'w-0 overflow-hidden border-r-0 opacity-0'
          }`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {renderOutlineContent()}
        </aside>
      )}

      {/* ── MOBILE OUTLINE DRAWER (< md) ── */}
      {isMobile && (
        <aside
          className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] glass-panel border-r shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            outlineOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
        >
          {renderOutlineContent()}
        </aside>
      )}

      {/* ── MAIN CHAT PANE (Fills remaining width) ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* ── HEADER ── */}
        <header
          className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 border-b glass-panel shrink-0 z-20"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Outline sidebar toggle */}
            <button
              id="chat-outline-toggle-btn"
              onClick={() => {
                setOutlineOpen(!outlineOpen);
                if (isMobile) setCitationsOpen(false);
              }}
              className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              style={{
                color: outlineOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                background: outlineOpen ? 'var(--color-accent-bg)' : 'transparent',
                border: outlineOpen ? '1px solid var(--color-accent-border)' : '1px solid transparent',
              }}
              title={outlineOpen ? 'Hide Outline' : 'Show Outline'}
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: '20px' }}>
                {outlineOpen ? 'menu_open' : 'menu'}
              </span>
            </button>

            {/* Document names pill */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-medium hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
                Chatting with <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{docCount}</span> doc{docCount !== 1 ? 's' : ''}
              </span>
              {Object.values(documentNames)
                .slice(0, 1)
                .map((name) => (
                  <div
                    key={name}
                    className="glass-pill px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 shadow-sm border truncate"
                    style={{
                      background: 'var(--color-accent-bg)',
                      color: 'var(--color-accent)',
                      borderColor: 'var(--color-accent-border)',
                    }}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">{name}</span>
                  </div>
                ))}
              {docCount > 1 && (
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400">
                  +{docCount - 1}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Citations toggle button */}
            <button
              id="chat-citations-toggle-btn"
              onClick={() => {
                setCitationsOpen(!citationsOpen);
                if (isMobile) setOutlineOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative"
              style={{
                background: citationsOpen ? 'var(--color-accent-bg)' : 'var(--color-bg-surface)',
                color: citationsOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                border: citationsOpen ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border)',
              }}
              title={citationsOpen ? 'Hide Citations' : 'Show Citations'}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Citations</span>
              {currentCitations.length > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {currentCitations.length}
                </span>
              )}
            </button>

            {/* Clear chat button */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </header>

        {/* ── MESSAGES CONTAINER ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 relative">
          {messages.length === 0 ? (
            /* Empty state & suggestion chips */
            <div className="flex-1 flex flex-col items-center justify-start pt-6 sm:pt-12 max-w-3xl mx-auto w-full gap-4 sm:gap-6 animate-fade-in">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg mb-1 border"
                style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-border)' }}
              >
                <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-center space-y-1.5">
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Ask about your documents
                </h2>
                <p className="text-xs sm:text-sm px-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Select a section from the outline, a suggestion chip, or type your question below
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-2 px-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="glass-button px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
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

        {/* ── FLOATING INPUT AREA ── */}
        <div
          className="p-3 sm:p-6 pt-0 pb-24 shrink-0"
          style={{ background: 'linear-gradient(to top, var(--color-bg-base) 60%, transparent)' }}
        >
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 rounded-2xl blur-md transition-all" style={{ background: 'var(--color-accent-glow)', opacity: 0.4 }} />
            <div className="relative glass-input rounded-2xl p-1.5 sm:p-2 flex items-end gap-2 shadow-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  documentIds.length === 0
                    ? 'Select documents from the library to start…'
                    : 'Ask a question about your documents…'
                }
                disabled={isLoading || documentIds.length === 0}
                rows={1}
                className="w-full bg-transparent border-none resize-none focus:ring-0 p-2.5 sm:p-3 text-xs sm:text-sm max-h-32 min-h-[44px] focus:outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim() || documentIds.length === 0}
                className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center transition-all mb-0.5 mr-0.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: 'var(--color-accent)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,102,255,0.3)',
                }}
                aria-label="Send message"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-1.5 hidden sm:block">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Enter to send · Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── DESKTOP CITATIONS SIDEBAR (md+) ── */}
      {!isMobile && (
        <aside
          className={`glass-panel border-l relative z-20 flex flex-col transition-all duration-300 ease-out ${
            citationsOpen ? 'w-80 opacity-100' : 'w-0 overflow-hidden border-l-0 opacity-0'
          }`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {renderCitationsContent()}
        </aside>
      )}

      {/* ── MOBILE CITATIONS DRAWER (< md) ── */}
      {isMobile && (
        <aside
          className={`fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[88vw] glass-panel border-l shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            citationsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
        >
          {renderCitationsContent()}
        </aside>
      )}

    </div>
  );
}

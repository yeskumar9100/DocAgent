'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadDocument, DocRecord } from '@/lib/api';
import { FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';

interface UploadAreaProps {
  onUploadSuccess?: (doc: DocRecord) => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  doc?: DocRecord;
}

export function UploadArea({ onUploadSuccess }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (fileList: File[]) => {
      const newFiles: UploadFile[] = fileList.map((f) => ({
        file: f,
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < newFiles.length; i++) {
        const idx = files.length + i;
        setFiles((prev) =>
          prev.map((f, j) => (j === idx ? { ...f, status: 'uploading', progress: 40 } : f))
        );

        try {
          const doc = await uploadDocument(newFiles[i].file);
          setFiles((prev) =>
            prev.map((f, j) =>
              j === idx ? { ...f, status: 'success', progress: 100, doc } : f
            )
          );
          onUploadSuccess?.(doc);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) =>
            prev.map((f, j) =>
              j === idx ? { ...f, status: 'error', progress: 0, error: message } : f
            )
          );
        }
      }
    },
    [files.length, onUploadSuccess]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) processFiles(dropped);
    },
    [processFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) processFiles(selected);
    e.target.value = '';
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`glass-upload-zone rounded-[32px] p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging ? 'border-blue-600 bg-white/60 shadow-lg scale-[1.01]' : ''
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={handleFileInput}
          id="file-upload-input"
        />

        <div className="bg-blue-50/80 p-4 rounded-2xl mb-6 shadow-sm">
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          {isDragging ? 'Drop your files now' : 'Drag and drop your files here'}
        </h3>
        <p className="text-slate-600 mb-4">
          or <span className="text-blue-500 font-semibold hover:underline">browse to upload from your computer</span>
        </p>
        <p className="text-xs text-slate-400">Supports PDF, TXT, DOCX up to 50 MB</p>
      </div>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Upload Queue
          </p>
          {files.map((f, idx) => (
            <div
              key={idx}
              className="animate-fade-in"
              style={{
                background: f.status === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-bg-card)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: `1px solid ${f.status === 'error' ? 'var(--color-error)' : 'var(--color-border)'}`,
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              {/* File Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: f.status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText style={{ width: 18, height: 18, color: f.status === 'error' ? 'var(--color-error)' : 'var(--color-accent)' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {f.file.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {formatSize(f.file.size)}
                </p>

                {/* Progress bar */}
                {f.status === 'uploading' && (
                  <div
                    style={{
                      marginTop: 8,
                      height: 4,
                      background: 'var(--color-border)',
                      borderRadius: 100,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${f.progress}%`,
                        background: 'var(--color-primary)',
                        borderRadius: 100,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}

                {f.status === 'error' && (
                  <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4 }}>{f.error}</p>
                )}

                {f.status === 'success' && (
                  <p style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, marginTop: 4 }}>
                    Indexed · {f.doc?.chunk_count} chunks
                  </p>
                )}
              </div>

              {/* Status Indicator */}
              {f.status === 'uploading' && (
                <Loader2
                  style={{ width: 18, height: 18, color: 'var(--color-primary)', flexShrink: 0, animation: 'spin 1s linear infinite' }}
                />
              )}
              {f.status === 'success' && (
                <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--color-success)', flexShrink: 0 }} />
              )}
              {f.status === 'error' && (
                <AlertCircle style={{ width: 18, height: 18, color: 'var(--color-error)', flexShrink: 0 }} />
              )}

              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                style={{
                  color: 'var(--color-text-secondary)',
                  transition: 'color 0.15s ease',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                aria-label="Remove file"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

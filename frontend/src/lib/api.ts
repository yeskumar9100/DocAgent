const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Extract a human-readable message from any API error shape. */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as Record<string, unknown>;

  // FastAPI/Pydantic validation errors: detail is an array of {loc, msg, type}
  if (Array.isArray(e.detail)) {
    const first = e.detail[0] as Record<string, unknown> | undefined;
    if (first && typeof first.msg === 'string') return first.msg;
    return e.detail.map((d: unknown) =>
      typeof d === 'object' && d !== null ? (d as Record<string, unknown>).msg ?? JSON.stringify(d) : String(d)
    ).join('; ');
  }

  // Plain string detail
  if (typeof e.detail === 'string') return e.detail;

  // detail is an object (shouldn't happen normally)
  if (typeof e.detail === 'object') return JSON.stringify(e.detail);

  // message field
  if (typeof e.message === 'string') return e.message;

  return fallback;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(extractErrorMessage(body, `API error ${res.status}`));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Documents ─────────────────────────────────────────────────────────────────

export interface DocRecord {
  id: number;
  original_filename: string;
  file_size: number;
  chunk_count: number;
  embedding_provider: string;
  embedding_model: string;
  status: 'processing' | 'ready' | 'error';
  error_message?: string;
  created_at: string;
}

export async function getDocuments(): Promise<DocRecord[]> {
  return apiFetch('/documents');
}

export async function uploadDocument(file: File): Promise<DocRecord> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed ${res.status}`);
  }
  return res.json();
}

export async function deleteDocument(id: number): Promise<void> {
  return apiFetch(`/documents/${id}`, { method: 'DELETE' });
}

// ── Chat / Ask ─────────────────────────────────────────────────────────────────

export interface Citation {
  text: string;
  document_id: number;
  filename: string;
  page: number;
  chunk_index: number;
  score: number;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  provider_used: string;
  model_used: string;
}

export async function askQuestion(
  question: string,
  documentIds: number[]
): Promise<AskResponse> {
  return apiFetch('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, document_ids: documentIds }),
  });
}

// ── Settings / Providers ───────────────────────────────────────────────────────

export interface ProviderRecord {
  provider_name: string;
  masked_key: string;
  base_url?: string;
  custom_name?: string;
  is_enabled: boolean;
  is_fallback: boolean;
  priority_order: number;
  status: 'not_configured' | 'connected' | 'rate_limited' | 'auth_error' | 'error';
  llm_model?: string;
  embedding_model?: string;
  backoff_remaining: number;
}

export async function getProviders(): Promise<ProviderRecord[]> {
  return apiFetch('/settings/providers');
}

export async function upsertProvider(data: {
  provider_name: string;
  api_key: string;
  base_url?: string;
  custom_name?: string;
  is_fallback?: boolean;
  priority_order?: number;
  llm_model?: string;
  embedding_model?: string;
}): Promise<ProviderRecord> {
  return apiFetch('/settings/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteProvider(providerName: string): Promise<void> {
  return apiFetch(`/settings/providers/${providerName}`, { method: 'DELETE' });
}

export interface ProviderTestResult {
  provider_name: string;
  status: string;
  latency_ms: number;
}

export async function testProviderConnection(providerName: string): Promise<ProviderTestResult> {
  return apiFetch(`/settings/providers/${providerName}/test`);
}

export async function getDocumentPages(docId: number): Promise<number[]> {
  return apiFetch(`/documents/${docId}/pages`);
}


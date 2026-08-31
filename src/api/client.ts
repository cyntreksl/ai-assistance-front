import {
  AppConfig,
  ChatSession,
  KnowledgeDocumentDetail,
  KnowledgeListResponse,
  KnowledgeUpsertResult,
  SourceTraceItem,
} from '../types';

export class RagApiClient {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = { ...config, apiUrl: config.apiUrl.replace(/\/+$/, '') };
  }

  public updateConfig(config: AppConfig) {
    this.config = { ...config, apiUrl: config.apiUrl.replace(/\/+$/, '') };
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };
  }

  private async request<T>(path: string, init?: RequestInit, authenticated = true): Promise<T> {
    const res = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: authenticated ? { ...this.headers, ...init?.headers } : init?.headers,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const errorPayload = typeof data === 'object' && data !== null ? data : undefined;
      const message =
        errorPayload && 'error' in errorPayload && typeof errorPayload.error === 'object' && errorPayload.error
          ? String((errorPayload.error as { message?: unknown }).message || '')
          : '';
      throw new Error(message || (typeof data === 'string' && data) || `Request failed with HTTP ${res.status}`);
    }

    return data as T;
  }

  async checkHealth(): Promise<{ status: string; database?: boolean; vector_store?: boolean }> {
    return this.request(
      `/health/ready?t=${Date.now()}`,
      {
        cache: 'no-store',
      },
      false
    );
  }

  async upsertKnowledge(params: {
    knowledgeId: string;
    title: string;
    content: string;
    contentFormat?: 'markdown' | 'text';
    sourceVersion?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KnowledgeUpsertResult> {
    return this.request(`/v1/knowledge/${encodeURIComponent(params.knowledgeId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        tenant_id: this.config.tenantId,
        title: params.title,
        content: params.content,
        content_format: params.contentFormat || 'markdown',
        source_version: params.sourceVersion || undefined,
        metadata: params.metadata || undefined,
      }),
    });
  }

  async listKnowledge(params?: { limit?: number; offset?: number }): Promise<KnowledgeListResponse> {
    const query = new URLSearchParams({
      tenant_id: this.config.tenantId,
      limit: String(params?.limit ?? 50),
      offset: String(params?.offset ?? 0),
    });
    return this.request(`/v1/knowledge?${query.toString()}`);
  }

  async getKnowledge(knowledgeId: string): Promise<KnowledgeDocumentDetail> {
    const query = new URLSearchParams({ tenant_id: this.config.tenantId });
    return this.request(`/v1/knowledge/${encodeURIComponent(knowledgeId)}?${query.toString()}`);
  }

  async deleteKnowledge(knowledgeId: string): Promise<{ knowledge_id: string; status: string }> {
    return this.request(`/v1/knowledge/${encodeURIComponent(knowledgeId)}?tenant_id=${encodeURIComponent(this.config.tenantId)}`, {
      method: 'DELETE',
    });
  }

  async createChatSession(title?: string): Promise<ChatSession> {
    return this.request('/v1/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: this.config.tenantId,
        external_user_id: this.config.userId,
        title: title || 'New Conversation',
      }),
    });
  }

  async listChatSessions(): Promise<ChatSession[]> {
    const query = new URLSearchParams({
      tenant_id: this.config.tenantId,
      external_user_id: this.config.userId,
    });
    return this.request(`/v1/chat/sessions?${query.toString()}`);
  }

  async getChatSession(sessionId: string): Promise<{
    session_id: string;
    title?: string;
    messages: Array<{
      message_id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      created_at: string;
      sources: SourceTraceItem[];
    }>;
  }> {
    const query = new URLSearchParams({ tenant_id: this.config.tenantId });
    return this.request(`/v1/chat/sessions/${encodeURIComponent(sessionId)}?${query.toString()}`);
  }

  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ message_id: string; answer: string; sources: SourceTraceItem[] }> {
    const query = new URLSearchParams({ tenant_id: this.config.tenantId });
    return this.request(`/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

import { AppConfig, ChatSession, KnowledgeUpsertResult, SourceTraceItem } from '../types';

export class RagApiClient {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  public updateConfig(config: AppConfig) {
    this.config = config;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };
  }

  async checkHealth(): Promise<{ status: string; database?: boolean; vector_store?: boolean }> {
    const res = await fetch(`${this.config.apiUrl}/health/ready`);
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async upsertKnowledge(params: {
    knowledgeId: string;
    title: string;
    content: string;
    contentFormat?: 'markdown' | 'text';
    sourceVersion?: string;
    metadata?: Record<string, any>;
  }): Promise<KnowledgeUpsertResult> {
    const url = `${this.config.apiUrl}/v1/knowledge/${encodeURIComponent(params.knowledgeId)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        tenant_id: this.config.tenantId,
        title: params.title,
        content: params.content,
        content_format: params.contentFormat || 'markdown',
        source_version: params.sourceVersion || undefined,
        metadata: params.metadata || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Indexing failed with HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async deleteKnowledge(knowledgeId: string): Promise<{ knowledge_id: string; status: string }> {
    const url = `${this.config.apiUrl}/v1/knowledge/${encodeURIComponent(knowledgeId)}?tenant_id=${encodeURIComponent(this.config.tenantId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Delete failed with HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async createChatSession(title?: string): Promise<ChatSession> {
    const res = await fetch(`${this.config.apiUrl}/v1/chat/sessions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        tenant_id: this.config.tenantId,
        external_user_id: this.config.userId,
        title: title || 'New Conversation',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Session creation failed with HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async listChatSessions(): Promise<ChatSession[]> {
    const query = new URLSearchParams({
      tenant_id: this.config.tenantId,
      external_user_id: this.config.userId,
    });
    const res = await fetch(`${this.config.apiUrl}/v1/chat/sessions?${query.toString()}`, {
      headers: this.headers,
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Failed to list sessions: HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
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
    const res = await fetch(`${this.config.apiUrl}/v1/chat/sessions/${sessionId}`, {
      headers: this.headers,
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Failed to fetch session: HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ message_id: string; answer: string; sources: SourceTraceItem[] }> {
    const res = await fetch(`${this.config.apiUrl}/v1/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.detail || `Failed to send message: HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }
}

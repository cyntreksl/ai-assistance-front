export interface AppConfig {
  apiUrl: string;
  apiKey: string;
  tenantId: string;
  userId: string;
}

export interface SourceTraceItem {
  knowledge_id: string;
  title: string;
  score?: number;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  sources?: SourceTraceItem[];
}

export interface ChatSession {
  session_id: string;
  tenant_id: string;
  external_user_id: string;
  title?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
}

export interface KnowledgeUpsertResult {
  knowledge_id: string;
  status: 'indexed' | 'pending' | 'failed';
  chunk_count: number;
  content_hash: string;
}

export interface KnowledgeDocumentSummary {
  knowledge_id: string;
  title?: string | null;
  content_format: 'markdown' | 'text' | string;
  source_version?: string | null;
  status: string;
  chunk_count: number;
  content_hash: string;
  indexed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentSummary {
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  translation_variants: Record<string, string>;
}

export interface KnowledgeListResponse {
  items: KnowledgeDocumentSummary[];
  total: number;
  limit: number;
  offset: number;
}

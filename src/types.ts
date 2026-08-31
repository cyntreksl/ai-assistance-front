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
  artifacts?: ChatArtifact[];
}

export interface JourneyState {
  stage?: string;
  assistant_mode?: 'disabled' | 'sandbox' | 'live';
  linked_entity_type?: string | null;
  linked_entity_id?: number | null;
  confirmed_fields?: string[];
  consent?: boolean;
  consent_status?: 'not_requested' | 'granted' | 'declined' | 'not_required' | string;
  profile_draft?: Record<string, unknown>;
  answered_fields?: string[];
  declined_fields?: string[];
  cv_status?: string;
  selected_vacancy_id?: number | null;
  interest_status?: 'none' | 'pending_contact' | 'recorded' | 'failed';
  selected_vacancy_requirements?: Record<string, unknown>;
  screening_complete?: boolean;
  review_ready?: boolean;
  conversion_status?: string | null;
  appointment_status?: string | null;
  handoff_status?: string;
  [key: string]: unknown;
}

export interface ChatArtifact {
  type: 'vacancies' | 'profile_review' | 'otp' | 'interview_slots' | 'appointment' | 'conversion' | 'handoff' | string;
  status?: string;
  items?: Array<Record<string, any>>;
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
  booking?: Record<string, any>;
  title?: string;
  body?: string;
  accept_label?: string;
  decline_label?: string;
}

export interface ToolEvent {
  tool: string;
  status: string;
  latency_ms: number;
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
  journey?: JourneyState;
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

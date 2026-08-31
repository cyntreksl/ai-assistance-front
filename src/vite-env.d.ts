/// <reference types="vite/client" />

interface RagRuntimeConfig {
  apiUrl?: string;
  apiKey?: string;
  tenantId?: string;
  userId?: string;
}

interface Window {
  __RAG_CONFIG__?: RagRuntimeConfig;
}

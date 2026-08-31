import { AppConfig } from './types';

const runtimeConfig = typeof window === 'undefined' ? undefined : window.__RAG_CONFIG__;

const getConfigValue = (runtimeValue: string | undefined, buildValue: string | undefined, fallback: string) =>
  runtimeValue?.trim() || buildValue?.trim() || fallback;

export const DEFAULT_CONFIG: AppConfig = {
  apiUrl: getConfigValue(runtimeConfig?.apiUrl, import.meta.env.VITE_RAG_API_URL, 'http://localhost:9000').replace(
    /\/+$/,
    ''
  ),
  apiKey: sessionStorage.getItem('jobbazaar_sandbox_credential') || runtimeConfig?.apiKey?.trim() || 'change-me',
  tenantId: getConfigValue(runtimeConfig?.tenantId, import.meta.env.VITE_RAG_TENANT_ID, 'jobbazaar'),
  userId: getConfigValue(runtimeConfig?.userId, import.meta.env.VITE_RAG_USER_ID, 'user-1'),
};

const STORAGE_KEY = 'rag_app_config_v1';
const LEGACY_STORAGE_KEY = 'rag_app_config';
const API_KEY_STORAGE_KEY = 'jobbazaar_sandbox_credential';

export const loadAppConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const persisted = saved ? (JSON.parse(saved) as Partial<AppConfig>) : {};
    delete persisted.apiKey;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return {
      ...DEFAULT_CONFIG,
      ...persisted,
      apiKey: sessionStorage.getItem(API_KEY_STORAGE_KEY) || DEFAULT_CONFIG.apiKey,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveAppConfig = (config: AppConfig): void => {
  const { apiKey, ...nonSensitiveConfig } = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nonSensitiveConfig));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

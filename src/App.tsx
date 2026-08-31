import React, { useState, useEffect } from 'react';
import { AppConfig } from './types';
import { RagApiClient } from './api/client';
import { KnowledgeTab } from './components/KnowledgeTab';
import { ChatTab } from './components/ChatTab';
import { SettingsModal } from './components/SettingsModal';
import {
  BookOpen,
  MessageSquare,
  Settings,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'http://localhost:9000',
  apiKey: 'test-service-key',
  tenantId: 'jobbazaar',
  userId: 'user-1',
};

export const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('rag_app_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tenantId === 'tenant-default') {
          parsed.tenantId = 'jobbazaar';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  const [apiClient] = useState<RagApiClient>(() => new RagApiClient(config));
  const [activeTab, setActiveTab] = useState<'knowledge' | 'chat'>('knowledge');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    localStorage.setItem('rag_app_config', JSON.stringify(config));
    apiClient.updateConfig(config);
    checkHealth();
  }, [config]);

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      const res = await apiClient.checkHealth();
      if (res.status === 'ready') {
        setHealthStatus('connected');
      } else {
        setHealthStatus('error');
      }
    } catch (err) {
      setHealthStatus('error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              RAG AI Assistant
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                v1.0
              </span>
            </span>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'knowledge'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'chat'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Assistant
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Health status badge */}
          <div
            onClick={checkHealth}
            title="Click to recheck API health"
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs transition"
          >
            {healthStatus === 'checking' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-slate-400 text-[11px]">Connecting...</span>
              </>
            )}
            {healthStatus === 'connected' && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium text-[11px]">API Online</span>
              </>
            )}
            {healthStatus === 'error' && (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-medium text-[11px]">API Offline</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configuration Settings"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {activeTab === 'knowledge' ? (
          <KnowledgeTab apiClient={apiClient} tenantId={config.tenantId} />
        ) : (
          <ChatTab
            apiClient={apiClient}
            tenantId={config.tenantId}
            userId={config.userId}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={(newConfig) => setConfig(newConfig)}
      />
    </div>
  );
};

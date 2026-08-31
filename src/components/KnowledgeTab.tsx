import React, { useEffect, useMemo, useState } from 'react';
import { RagApiClient } from '../api/client';
import { KnowledgeDocumentSummary, KnowledgeUpsertResult } from '../types';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Hash,
  Languages,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';

interface KnowledgeTabProps {
  apiClient: RagApiClient;
  tenantId: string;
}

interface KnowledgeFormState {
  knowledgeId: string;
  title: string;
  content: string;
  format: 'markdown' | 'text';
  version: string;
  metadataJson: string;
  translationVariants: Record<string, string>;
}

const SAMPLE_DOCS = [
  {
    title: 'Platform Architecture Guide',
    content: `# Platform Architecture Overview

## Introduction
The Standalone RAG system is built with high-throughput multi-tenant vector indexing in Qdrant and persistent conversation sessions in PostgreSQL.

## Features
- Content-aware semantic chunking with heading preservation.
- Hybrid isolation per tenant.
- Token budgeting and grounded prompt protection.`,
  },
  {
    title: 'Customer Refund Policy',
    content: `# Customer Refund and Cancellation Policy

## Standard Refunds
Customers are eligible for a full refund within 30 days of initial purchase if service usage has not exceeded 1,000 API units.

## Process
To request a refund, submit a ticket via the billing portal with invoice ID and account reference.`,
  },
];

const emptyForm = (): KnowledgeFormState => ({
  knowledgeId: '',
  title: '',
  content: '',
  format: 'markdown',
  version: 'v1.0',
  metadataJson: '{\n  "category": "documentation"\n}',
  translationVariants: {},
});

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'knowledge';
};

const randomSuffix = () => Math.random().toString(16).slice(2, 8);

const formatDate = (value?: string | null) => {
  if (!value) return 'Not indexed';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ apiClient, tenantId }) => {
  const [documents, setDocuments] = useState<KnowledgeDocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<KnowledgeFormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [autoSuffix, setAutoSuffix] = useState(randomSuffix);
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastResult, setLastResult] = useState<KnowledgeUpsertResult | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      `${doc.knowledge_id} ${doc.title || ''}`.toLowerCase().includes(needle)
    );
  }, [documents, query]);

  const fetchDocuments = async () => {
    setListLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.listKnowledge({ limit: 100, offset: 0 });
      setDocuments(data.items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load knowledge documents.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    setSelectedId(null);
    setForm(emptyForm());
    setAutoSuffix(randomSuffix());
    setIdManuallyEdited(false);
    void fetchDocuments();
  }, [tenantId]);

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setAutoSuffix(randomSuffix());
    setIdManuallyEdited(false);
    setLastResult(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleLoadSample = (sample: (typeof SAMPLE_DOCS)[number]) => {
    const suffix = randomSuffix();
    setAutoSuffix(suffix);
    setSelectedId(null);
    setIdManuallyEdited(false);
    setLastResult(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    setForm({
      ...emptyForm(),
      title: sample.title,
      knowledgeId: `${slugify(sample.title)}-${suffix}`,
      content: sample.content,
      format: 'markdown',
    });
  };

  const loadDocument = async (knowledgeId: string) => {
    setSelectedId(knowledgeId);
    setDetailLoading(true);
    setLastResult(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const detail = await apiClient.getKnowledge(knowledgeId);
      setForm({
        knowledgeId: detail.knowledge_id,
        title: detail.title || '',
        content: detail.content || '',
        format: detail.content_format === 'text' ? 'text' : 'markdown',
        version: detail.source_version || '',
        metadataJson: detail.metadata ? JSON.stringify(detail.metadata, null, 2) : '',
        translationVariants: detail.translation_variants || {},
      });
      setIdManuallyEdited(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load knowledge document.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      knowledgeId: idManuallyEdited ? prev.knowledgeId : title.trim() ? `${slugify(title)}-${autoSuffix}` : '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    const knowledgeId = (form.knowledgeId.trim() || `${slugify(title)}-${autoSuffix}`).trim();

    if (!title || !content || !knowledgeId) {
      setErrorMsg('Knowledge ID, title, and content are required.');
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    if (form.metadataJson.trim()) {
      try {
        metadata = JSON.parse(form.metadataJson);
      } catch {
        setErrorMsg('Invalid metadata JSON syntax.');
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await apiClient.upsertKnowledge({
        knowledgeId,
        title,
        content,
        contentFormat: form.format,
        sourceVersion: form.version.trim() || undefined,
        metadata,
      });
      setLastResult(result);
      await fetchDocuments();
      await loadDocument(knowledgeId);
      setLastResult(result);
      setSuccessMsg(`Saved and indexed "${knowledgeId}" with multilingual variants.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save knowledge document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const knowledgeId = form.knowledgeId.trim();
    if (!knowledgeId) {
      setErrorMsg('Select or enter a Knowledge ID to delete.');
      return;
    }
    if (!confirm(`Delete knowledge document "${knowledgeId}" for tenant "${tenantId}"?`)) return;

    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastResult(null);
    try {
      await apiClient.deleteKnowledge(knowledgeId);
      handleNew();
      setSuccessMsg(`Deleted "${knowledgeId}".`);
      await fetchDocuments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete knowledge document.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedDocument = documents.find((doc) => doc.knowledge_id === selectedId);
  const translationEntries = Object.entries(form.translationVariants);

  return (
    <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full p-4 gap-4 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="bg-slate-800/70 border border-slate-700/80 rounded-xl overflow-hidden flex flex-col min-h-[320px] shadow-sm">
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Knowledge Base
            </h1>
            <p className="text-[11px] text-slate-400 mt-1">
              Tenant <span className="font-mono text-emerald-300">{tenantId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDocuments}
            disabled={listLoading}
            title="Refresh documents"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-3 space-y-3 border-b border-slate-700/80">
          <button
            type="button"
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 px-3 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or ID"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listLoading ? (
            <div className="flex justify-center items-center py-8 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500">
              No knowledge documents found.
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isActive = doc.knowledge_id === selectedId;
              return (
                <button
                  key={doc.knowledge_id}
                  type="button"
                  onClick={() => loadDocument(doc.knowledge_id)}
                  className={`w-full text-left p-3 rounded-lg text-xs transition border ${
                    isActive
                      ? 'bg-slate-700 text-white border-slate-600'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="font-medium truncate">{doc.title || 'Untitled Document'}</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1 truncate">{doc.knowledge_id}</div>
                  <div className="flex items-center justify-between gap-2 mt-2 text-[10px]">
                    <span className="uppercase text-emerald-400">{doc.status}</span>
                    <span className="text-slate-500">{doc.chunk_count} chunks</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="overflow-y-auto bg-slate-800/50 border border-slate-700/80 rounded-xl shadow-sm">
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-700/80">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {selectedId ? 'Edit Knowledge Document' : 'Create Knowledge Document'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Save the original once; English, Sinhala, Tamil, and Singlish variants are generated for retrieval.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_DOCS.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  {sample.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {(errorMsg || successMsg || detailLoading) && (
            <div
              className={`p-3.5 border rounded-xl text-xs flex items-start gap-2.5 ${
                errorMsg
                  ? 'bg-red-950/60 border-red-800/80 text-red-200'
                  : 'bg-emerald-950/50 border-emerald-800/70 text-emerald-200'
              }`}
            >
              {detailLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0 mt-0.5" />
              ) : errorMsg ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{detailLoading ? 'Loading document details...' : errorMsg || successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Document Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
                placeholder="e.g. Refund Policy"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Knowledge ID *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={form.knowledgeId}
                  onChange={(e) => {
                    setIdManuallyEdited(true);
                    setForm((prev) => ({ ...prev, knowledgeId: e.target.value }));
                  }}
                  required
                  placeholder="auto-generated from title"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Content Format
              </label>
              <select
                value={form.format}
                onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value as 'markdown' | 'text' }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="markdown">Markdown</option>
                <option value="text">Plain Text</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Source Version
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="e.g. v1.0.4"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Original Content *
            </label>
            <textarea
              rows={12}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              required
              placeholder="# Enter document headings and content here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Metadata JSON
            </label>
            <textarea
              rows={3}
              value={form.metadataJson}
              onChange={(e) => setForm((prev) => ({ ...prev, metadataJson: e.target.value }))}
              placeholder='{ "category": "operations" }'
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {translationEntries.length > 0 && (
            <div className="space-y-3 border border-slate-700/70 rounded-xl p-4 bg-slate-900/40">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-emerald-400" />
                Read-only Indexed Variants
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {translationEntries.map(([language, value]) => (
                  <div key={language} className="space-y-1.5">
                    <label className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
                      {language}
                    </label>
                    <textarea
                      readOnly
                      rows={4}
                      value={value}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-400 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Chunks
                </span>
                <p className="font-mono text-emerald-300 font-bold text-base">{lastResult.chunk_count}</p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  Content SHA-256
                </span>
                <p className="font-mono text-[11px] text-slate-300 break-all">{lastResult.content_hash}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700/80">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving || !form.knowledgeId.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-lg transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>

            <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] text-slate-500">
              {selectedDocument && <span>Last updated {formatDate(selectedDocument.updated_at)}</span>}
              <button
                type="submit"
                disabled={saving || deleting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md shadow-emerald-950/50 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving and translating...' : 'Save / Index'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

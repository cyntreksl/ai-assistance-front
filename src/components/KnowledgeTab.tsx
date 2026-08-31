import React, { useState } from 'react';
import { RagApiClient } from '../api/client';
import { KnowledgeUpsertResult } from '../types';
import { BookOpen, Upload, Trash2, CheckCircle2, AlertCircle, Sparkles, Hash, Layers } from 'lucide-react';

interface KnowledgeTabProps {
  apiClient: RagApiClient;
  tenantId: string;
}

const SAMPLE_DOCS = [
  {
    title: 'Platform Architecture Guide',
    knowledgeId: 'kb-arch-overview',
    content: `# Platform Architecture Overview

## Introduction
The Standalone RAG system is built with high-throughput multi-tenant vector indexing in Qdrant and persistent conversation sessions in PostgreSQL.

## Features
- Content-aware semantic chunking with heading preservation.
- Hybrid isolation per tenant.
- Token budgeting and grounded prompt protection.

## Deployment
Services run on Docker Compose with PostgreSQL 16, Qdrant vector database, and FastAPI backend.`,
  },
  {
    title: 'Customer Refund Policy',
    knowledgeId: 'kb-refund-policy',
    content: `# Customer Refund and Cancellation Policy

## Standard Refunds
Customers are eligible for a full refund within 30 days of initial purchase if service usage has not exceeded 1,000 API units.

## Exceptions
Custom enterprise agreements and specialized data training runs are non-refundable once initiated.

## Process
To request a refund, submit a ticket via the billing portal with invoice ID and account reference.`,
  },
];

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ apiClient, tenantId }) => {
  const [knowledgeId, setKnowledgeId] = useState('kb-doc-001');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'markdown' | 'text'>('markdown');
  const [version, setVersion] = useState('v1.0');
  const [metadataJson, setMetadataJson] = useState('{\n  "category": "documentation"\n}');

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lastResult, setLastResult] = useState<KnowledgeUpsertResult | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoadSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setKnowledgeId(sample.knowledgeId);
    setTitle(sample.title);
    setContent(sample.content);
    setFormat('markdown');
    setVersion('v1.0');
    setLastResult(null);
    setDeleteMsg(null);
    setErrorMsg(null);
  };

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeId.trim() || !title.trim() || !content.trim()) {
      setErrorMsg('Knowledge ID, Title, and Content are required.');
      return;
    }

    let parsedMeta: Record<string, any> | undefined = undefined;
    if (metadataJson.trim()) {
      try {
        parsedMeta = JSON.parse(metadataJson);
      } catch (err) {
        setErrorMsg('Invalid Metadata JSON syntax.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);
    setDeleteMsg(null);
    try {
      const res = await apiClient.upsertKnowledge({
        knowledgeId: knowledgeId.trim(),
        title: title.trim(),
        content: content.trim(),
        contentFormat: format,
        sourceVersion: version.trim() || undefined,
        metadata: parsedMeta,
      });
      setLastResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to index knowledge document.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!knowledgeId.trim()) {
      setErrorMsg('Enter a Knowledge ID to delete.');
      return;
    }
    if (!confirm(`Are you sure you want to delete knowledge document "${knowledgeId}" for tenant "${tenantId}"?`)) {
      return;
    }

    setDeleteLoading(true);
    setErrorMsg(null);
    setDeleteMsg(null);
    setLastResult(null);
    try {
      const res = await apiClient.deleteKnowledge(knowledgeId.trim());
      setDeleteMsg(`Document "${res.knowledge_id}" deleted from vector store & registry.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete knowledge document.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header & Quick Samples */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 backdrop-blur-sm shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Knowledge Base Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chunk, embed, and index Markdown or text knowledge documents into Qdrant for tenant <span className="font-mono text-emerald-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">{tenantId}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Presets:
          </span>
          {SAMPLE_DOCS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadSample(s)}
              className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg transition"
            >
              {s.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <form onSubmit={handleUpsert} className="lg:col-span-2 space-y-4 bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Knowledge ID *
              </label>
              <input
                type="text"
                value={knowledgeId}
                onChange={(e) => setKnowledgeId(e.target.value)}
                required
                placeholder="e.g. doc-product-guide"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. System Overview & Setup"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Content Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
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
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.0.4"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Document Content (Markdown / Text) *
            </label>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="# Enter document headings and content here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Metadata (JSON format, optional)
            </label>
            <textarea
              rows={3}
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              placeholder='{ "author": "dev", "tag": "core" }'
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading || loading}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-lg transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? 'Deleting...' : 'Delete Document'}
            </button>

            <button
              type="submit"
              disabled={loading || deleteLoading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md shadow-emerald-950/50 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Indexing into Qdrant...' : 'Index / Upsert Document'}
            </button>
          </div>
        </form>

        {/* Status / Output Panel */}
        <div className="space-y-4">
          {/* Status feedback */}
          {errorMsg && (
            <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Operation Failed</strong>
                <p className="opacity-90">{errorMsg}</p>
              </div>
            </div>
          )}

          {deleteMsg && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Deleted</strong>
                <p className="opacity-90">{deleteMsg}</p>
              </div>
            </div>
          )}

          {lastResult && (
            <div className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully Indexed
                </span>
                <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded uppercase font-mono">
                  {lastResult.status}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Semantic Chunks:
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-sm">
                    {lastResult.chunk_count}
                  </span>
                </div>

                <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    Content SHA-256:
                  </span>
                  <p className="font-mono text-[11px] text-slate-300 break-all select-all">
                    {lastResult.content_hash}
                  </p>
                </div>

                <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Knowledge ID:</span>
                  <p className="font-mono text-slate-200 font-medium">
                    {lastResult.knowledge_id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 text-xs text-slate-400 space-y-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              How Indexing Works
            </h3>
            <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
              <li>Documents are parsed with Markdown hierarchy awareness to preserve section context.</li>
              <li>Chunks are vectorized with OpenAI <code className="text-slate-300">text-embedding-3-small</code> (1536 dim).</li>
              <li>Stored into Qdrant with tenant payload isolation.</li>
              <li>Upserts are idempotent; updates atomically replace previous chunks.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

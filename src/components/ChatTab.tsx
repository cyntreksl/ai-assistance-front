import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { RagApiClient } from '../api/client';
import { ChatMessage, ChatSession } from '../types';
import {
  MessageSquare,
  Send,
  Plus,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface ChatTabProps {
  apiClient: RagApiClient;
  tenantId: string;
  userId: string;
}

export const ChatTab: React.FC<ChatTabProps> = ({ apiClient, tenantId, userId }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load existing sessions
  const fetchSessions = async () => {
    try {
      setSessionLoading(true);
      const data = await apiClient.listChatSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        loadSession(data[0].session_id);
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [tenantId, userId]);

  const loadSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setErrorMsg(null);
    try {
      const details = await apiClient.getChatSession(sessionId);
      setMessages(
        details.messages.map((m) => ({
          id: m.message_id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
          sources: m.sources,
        }))
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load session history.');
    }
  };

  const handleCreateNewSession = async () => {
    setErrorMsg(null);
    try {
      setLoading(true);
      const session = await apiClient.createChatSession(`Chat #${sessions.length + 1}`);
      setSessions([session, ...sessions]);
      setActiveSessionId(session.session_id);
      setMessages([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create new chat session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputMessage.trim();
    if (!prompt || loading) return;

    let currSessionId = activeSessionId;
    setErrorMsg(null);

    // If no active session, automatically create one first
    if (!currSessionId) {
      try {
        setLoading(true);
        const newSession = await apiClient.createChatSession(
          prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '')
        );
        currSessionId = newSession.session_id;
        setActiveSessionId(currSessionId);
        setSessions([newSession, ...sessions]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to create chat session.');
        setLoading(false);
        return;
      }
    }

    const optimisticUserMsg: ChatMessage = {
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await apiClient.sendMessage(currSessionId, prompt);
      const assistantMsg: ChatMessage = {
        id: response.message_id,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate assistant response.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceAccordion = (index: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full p-4 gap-4">
      {/* Sessions Sidebar */}
      <div className="w-64 bg-slate-800/70 border border-slate-700/80 rounded-xl flex flex-col overflow-hidden hidden md:flex shrink-0 shadow-sm">
        <div className="p-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={fetchSessions}
            title="Refresh sessions"
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-700">
          <button
            onClick={handleCreateNewSession}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 px-3 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionLoading ? (
            <div className="flex justify-center items-center py-6 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Loading chats...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-500">
              No sessions yet. Click "New Chat" to start.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.session_id === activeSessionId;
              return (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-slate-700 text-white font-medium border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate flex-1">{s.title || 'Untitled Chat'}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700/80 rounded-xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">RAG Conversational Assistant</h2>
              <p className="text-[11px] text-slate-400">
                Grounded answering with citations from Qdrant vector store.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewSession}
              className="md:hidden flex items-center gap-1 bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-full text-emerald-400 shadow-md">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">How can I assist you today?</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Ask any question grounded in the indexed knowledge base. Retrieved citations and similarity scores will be displayed with every answer.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const hasSources = msg.sources && msg.sources.length > 0;
            const isExpanded = expandedSources[idx];

            return (
              <div
                key={idx}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none prose prose-invert max-w-none text-xs leading-relaxed'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  {/* Retrieved Sources Accordion */}
                  {hasSources && (
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl overflow-hidden text-xs max-w-xl">
                      <button
                        type="button"
                        onClick={() => toggleSourceAccordion(idx)}
                        className="w-full px-3 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition font-medium"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <ExternalLink className="w-3 h-3" />
                          Retrieved Sources ({msg.sources!.length})
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-2.5 pt-0 space-y-1.5 border-t border-slate-800">
                          {msg.sources!.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]"
                            >
                              <div className="truncate mr-2">
                                <span className="font-semibold text-slate-200">{s.title}</span>
                                <span className="text-slate-500 font-mono ml-2">({s.knowledge_id})</span>
                              </div>
                              {s.score !== undefined && s.score !== null && (
                                <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-[10px] rounded shrink-0">
                                  {(s.score * 100).toFixed(1)}% match
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl rounded-bl-none px-4 py-3 text-slate-400 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Searching knowledge and generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-slate-700/80 bg-slate-800/80"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              placeholder="Ask a question about your indexed knowledge..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-lg transition shadow-md shadow-emerald-950"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

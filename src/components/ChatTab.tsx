import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BriefcaseBusiness, Bug, CalendarDays, Check, FileText, Loader2,
  MessageSquarePlus, Paperclip, Send, ShieldCheck, Sparkles, UploadCloud, UserRoundCheck,
} from 'lucide-react';
import { RagApiClient } from '../api/client';
import { ChatArtifact, ChatMessage, ChatSession, JourneyState, ToolEvent } from '../types';

interface Props { apiClient: RagApiClient; tenantId: string; userId: string }

const money = (salary: any) => {
  if (!salary) return 'Ask Anya for current terms';
  const value = salary.basic || (salary.min && salary.max ? `${salary.min}–${salary.max}` : salary.min || salary.max);
  return value ? `${salary.currency || ''} ${value}`.trim() : 'Salary confirmed during screening';
};

export const ChatTab: React.FC<Props> = ({ apiClient, tenantId, userId }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [journey, setJourney] = useState<JourneyState>({ stage: 'engage', consent: false });
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspector, setInspector] = useState(false);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [otpType, setOtpType] = useState<'mobile' | 'whatsapp' | 'email'>('mobile');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => { void refreshSessions(); }, [tenantId, userId]);

  const refreshSessions = async () => {
    try {
      const data = await apiClient.listChatSessions();
      setSessions(data);
      if (!sessionId && data[0]) await loadSession(data[0].session_id);
    } catch { /* connection state is shown globally */ }
  };

  const loadSession = async (id: string) => {
    setError(null); setSessionId(id);
    try {
      const data = await apiClient.getChatSession(id);
      setMessages(data.messages.map((message) => ({ id: message.message_id, ...message })));
      setJourney(data.journey || { stage: 'engage' });
      setToolEvents(data.tool_events || []);
      setConsent(Boolean(data.journey?.consent));
    } catch (e: any) { setError(e.message || 'Could not restore this conversation.'); }
  };

  const newChat = async () => {
    setBusy(true); setError(null);
    try {
      const session = await apiClient.createChatSession('Anya recruitment chat');
      setSessions((current) => [session, ...current]); setSessionId(session.session_id);
      setMessages([]); setJourney({ stage: 'engage', consent: false }); setToolEvents([]); setConsent(false);
    } catch (e: any) { setError(e.message || 'Could not start a chat.'); }
    finally { setBusy(false); }
  };

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const created = await apiClient.createChatSession('Anya recruitment chat');
    setSessionId(created.session_id); setSessions((current) => [created, ...current]);
    return created.session_id;
  };

  const send = async (text: string, actions: Record<string, unknown> = {}) => {
    if (!text.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const id = await ensureSession();
      setMessages((current) => [...current, { role: 'user', content: text, created_at: new Date().toISOString() }]);
      setInput('');
      const response = await apiClient.sendMessage(id, text, { ...actions, consent_granted: consent || journey.consent === true });
      setMessages((current) => [...current, { id: response.message_id, role: 'assistant', content: response.answer, sources: response.sources, artifacts: response.artifacts, created_at: new Date().toISOString() }]);
      setJourney(response.journey); setToolEvents((current) => [...current, ...response.tool_events]);
    } catch (e: any) { setError(e.message || 'Anya could not reply just now. Nothing was saved.'); }
    finally { setBusy(false); }
  };

  const uploadCv = async (file?: File) => {
    if (!file) return;
    if (!journey.linked_entity_id) { setError('Before attaching a CV, share a phone number and use the consent option so Anya can link it to the right JobBazaar record.'); return; }
    setUploading(true); setError(null);
    try {
      const id = await ensureSession();
      const result = await apiClient.uploadCv(id, file);
      setMessages((current) => [...current,
        { role: 'user', content: `Attached CV: ${result.filename}`, created_at: new Date().toISOString() },
        { role: 'assistant', content: result.extraction_status === 'extracted' ? 'I found a few details in your CV. Please review them before I save anything as fact.' : 'I kept your CV safely, but I could not read all its text. We can fill in your profile together.', artifacts: [result.artifact], created_at: new Date().toISOString() },
      ]);
      setJourney((current) => ({ ...current, cv_status: result.extraction_status, stage: result.extraction_status === 'extracted' ? 'profile_review' : current.stage }));
    } catch (e: any) { setError(e.message || 'CV upload failed.'); }
    finally { setUploading(false); }
  };

  const sendOtp = async () => {
    if (!sessionId) return;
    try { await apiClient.sendOtp(sessionId, otpType); setOtpSent(true); }
    catch (e: any) { setError(e.message || 'Could not send verification code.'); }
  };
  const verifyOtp = async () => {
    if (!sessionId || otpCode.length !== 6) return;
    try { const ok = await apiClient.verifyOtp(sessionId, otpType, otpCode); if (ok) { setOtpSent(false); setOtpCode(''); } }
    catch (e: any) { setError(e.message || 'Verification failed.'); }
  };

  const renderArtifact = (artifact: ChatArtifact, key: string) => {
    if (artifact.type === 'vacancies') return (
      <div key={key} className="grid gap-3 sm:grid-cols-2">
        {(artifact.items || []).map((job: any) => (
          <article key={job.id} className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-teal-700">{job.reference || 'LIVE VACANCY'}</p><h4 className="mt-1 font-semibold text-slate-900">{job.title}</h4><p className="text-sm text-slate-500">{job.country}{job.city ? ` · ${job.city}` : ''}</p></div><BriefcaseBusiness className="h-5 w-5 text-teal-600" /></div>
            <p className="mt-3 text-sm font-semibold text-slate-800">{money(job.salary)}</p>
            {job.match_reasons?.length > 0 && <p className="mt-2 text-xs text-teal-700">{job.match_reasons.join(' ')}</p>}
            <button disabled={busy} onClick={() => void send(`I'm interested in ${job.title} (${job.reference || job.id}).`, { selected_vacancy_id: job.id })} className="mt-4 w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">I’m interested</button>
          </article>
        ))}
      </div>
    );
    if (artifact.type === 'profile_review') return (
      <div key={key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-slate-800">
        <div className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-amber-600" />CV profile review</div>
        {Object.keys(artifact.fields || {}).length ? <dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(artifact.fields || {}).map(([field, value]) => <div key={field} className="rounded-lg bg-white p-2"><dt className="text-[10px] uppercase text-slate-400">{field.replace(/_/g, ' ')}</dt><dd className="text-sm">{Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</dd></div>)}</dl> : <p className="mt-2 text-sm">No readable profile fields were found.</p>}
        {Object.keys(artifact.fields || {}).length > 0 && <button onClick={() => void send('I reviewed these CV details and confirm they are correct.', { confirmed_fields: Object.keys(artifact.fields || {}), profile_fields: artifact.fields })} className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Confirm these details</button>}
      </div>
    );
    if (artifact.type === 'interview_slots') return (
      <div key={key} className="rounded-2xl border border-violet-200 bg-white p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><CalendarDays className="h-4 w-4 text-violet-600" />Available office interviews</div><div className="mt-3 flex flex-wrap gap-2">{(artifact.items || []).slice(0, 12).map((slot: any) => <button key={slot.starts_at} onClick={() => void send(`Please confirm my physical interview for ${new Date(slot.starts_at).toLocaleString()}.`, { selected_slot: slot.starts_at, booking_confirmed: true })} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 hover:bg-violet-100">{new Date(slot.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</button>)}</div></div>
    );
    const label = artifact.type === 'appointment' ? 'Physical interview confirmed' : artifact.type === 'conversion' ? 'Candidate review requested' : 'Human follow-up requested';
    return <div key={key} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"><Check className="h-5 w-5" />{label}</div>;
  };

  return <div className="mx-auto flex h-full w-full max-w-[1500px] gap-4 overflow-hidden p-3 sm:p-5">
    <aside className="hidden w-64 shrink-0 flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-3 lg:flex">
      <button onClick={() => void newChat()} className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-slate-950"><MessageSquarePlus className="h-4 w-4" />New candidate chat</button>
      <p className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sandbox sessions</p>
      <div className="space-y-1 overflow-y-auto">{sessions.map((item) => <button key={item.session_id} onClick={() => void loadSession(item.session_id)} className={`w-full rounded-xl px-3 py-2 text-left text-xs ${item.session_id === sessionId ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{item.title || 'Anya recruitment chat'}</button>)}</div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#f4f7f7] shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3"><div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-slate-950 via-slate-800 to-amber-100 text-2xl">👩🏻<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /></div><div><h2 className="font-bold text-slate-900">Anya</h2><div className="flex items-center gap-2 text-xs text-slate-500"><span className="rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">Virtual recruiter</span><span>Online</span></div></div></div>
        <button onClick={() => setInspector(!inspector)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${inspector ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}><Bug className="h-4 w-4" />Inspector</button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && <div className="mx-auto mt-10 max-w-xl rounded-3xl bg-white p-7 text-center shadow-sm"><Sparkles className="mx-auto h-7 w-7 text-teal-600" /><h3 className="mt-3 text-xl font-bold text-slate-900">Hi, I’m Anya, JobBazaar’s virtual recruitment consultant.</h3><p className="mt-2 text-sm leading-6 text-slate-600">Tell me what kind of job you’re looking for. I can check live vacancies, securely review your CV after linking your contact, and help arrange a physical interview.</p></div>}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {messages.map((message, index) => <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className="max-w-[88%] space-y-3 sm:max-w-2xl"><div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-teal-600 text-white' : 'rounded-bl-md bg-white text-slate-700'}`}><ReactMarkdown>{message.content}</ReactMarkdown></div>{message.artifacts?.map((artifact, artifactIndex) => renderArtifact(artifact, `${index}-${artifactIndex}`))}</div></div>)}
            {journey.linked_entity_id && !journey.appointment_status && <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-teal-600" />Verify a contact</div><p className="mt-1 text-xs text-slate-500">Codes are handled securely and never added to the chat transcript.</p><div className="mt-3 flex flex-wrap gap-2"><select value={otpType} onChange={(e) => setOtpType(e.target.value as any)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"><option value="mobile">Mobile</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>{!otpSent ? <button onClick={() => void sendOtp()} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Send code</button> : <><input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" /><button onClick={() => void verifyOtp()} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white">Verify</button></>}</div></div>}
            {journey.stage === 'interested' && <div className="mx-auto w-full max-w-2xl rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="text-sm font-semibold text-teal-900">Ready for JobBazaar staff to review your profile?</p><p className="mt-1 text-xs text-teal-700">This requests review; it does not guarantee selection or create a candidate immediately.</p><button onClick={() => void send('Yes, I want to proceed with this opportunity and request staff review.', { proceed_confirmed: true })} className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Proceed to staff review</button></div>}
            {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-teal-600" />Anya is checking…</div>}<div ref={endRef} />
          </main>

          <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadCv(event.dataTransfer.files[0]); }} className={`border-t p-3 sm:p-4 ${dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white'}`}>
            {!journey.consent && <label className="mb-3 flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-teal-600" /><span><b>Personal-data consent:</b> I agree JobBazaar may store the contact/profile details I choose to share for recruitment follow-up. I can still chat without agreeing.</span></label>}
            <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2"><label className={`rounded-xl border border-slate-200 p-3 ${journey.linked_entity_id ? 'cursor-pointer text-slate-500 hover:bg-slate-50' : 'cursor-not-allowed text-slate-300'}`} title={journey.linked_entity_id ? 'Upload CV' : 'Link a consented phone number before uploading'}><input type="file" accept=".pdf,.doc,.docx" disabled={!journey.linked_entity_id} className="hidden" onChange={(event) => void uploadCv(event.target.files?.[0])} /><Paperclip className="h-5 w-5" /></label><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="Message Anya…" rows={1} className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500" /><button disabled={!input.trim() || busy} className="rounded-xl bg-teal-600 p-3 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button></form>
            {uploading && <p className="mt-2 flex items-center gap-2 text-xs text-teal-700"><UploadCloud className="h-4 w-4 animate-pulse" />Uploading securely and extracting profile…</p>}
          </div>
        </div>

        {inspector && <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-950 p-4 text-xs text-slate-300 md:block"><h3 className="mb-4 flex items-center gap-2 font-bold text-white"><ShieldCheck className="h-4 w-4 text-violet-400" />Sandbox inspector</h3><InspectorRow label="Journey" value={journey.stage} /><InspectorRow label="Linked record" value={journey.linked_entity_type ? `${journey.linked_entity_type} #${journey.linked_entity_id}` : 'Not linked'} /><InspectorRow label="Consent" value={journey.consent ? 'Recorded' : 'Not recorded'} /><InspectorRow label="CV" value={journey.cv_status} /><InspectorRow label="Confirmed fields" value={(journey.confirmed_fields || []).join(', ') || 'None'} /><InspectorRow label="Conversion" value={journey.conversion_status || 'Not requested'} /><InspectorRow label="Appointment" value={journey.appointment_status || 'Not booked'} /><h4 className="mb-2 mt-5 font-bold text-slate-100">Tool traces</h4><div className="space-y-2">{toolEvents.length ? toolEvents.map((event, index) => <div key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-2"><div className="flex justify-between"><span>{event.tool}</span><span className={event.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>{event.status}</span></div><span className="text-slate-600">{event.latency_ms} ms · arguments redacted</span></div>) : <p className="text-slate-600">No tools called yet.</p>}</div>{journey.linked_entity_id && <div className="mt-5 rounded-xl border border-slate-800 p-3"><UserRoundCheck className="mb-2 h-4 w-4 text-teal-400" /><p>This is a tagged sandbox record. It is intentionally retained for staff review.</p></div>}
          </aside>}
      </div>
    </section>
  </div>;
};

const InspectorRow = ({ label, value }: { label: string; value: unknown }) => <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-900 pb-2"><span className="text-slate-500">{label}</span><span className="text-right text-slate-200">{String(value || '—')}</span></div>;

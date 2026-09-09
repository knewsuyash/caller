import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Plus, 
  Trash2, 
  ArrowDownUp, 
  Sliders, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Play, 
  Activity, 
  PhoneOff, 
  Mic, 
  MicOff,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface VedOperationsProps {
  transcripts?: any[];
  callStatus?: string;
  callSid?: string | null;
  onCall?: (number: string) => void;
  onHangup?: () => void;
  onMute?: (muted: boolean) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function VedOperations({
  transcripts = [],
  callStatus = 'idle',
  callSid = null,
  onCall,
  onHangup,
  onMute
}: VedOperationsProps) {
  // Numbers Pool State
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingNumber, setAddingNumber] = useState(false);
  const [numbersError, setNumbersError] = useState('');

  // Prompt State
  const [prompt, setPrompt] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSavedNotice, setPromptSavedNotice] = useState(false);

  // Test Outbound Dialer State
  const [testNumber, setTestNumber] = useState('+91 63069 87592');
  const [isMuted, setIsMuted] = useState(false);

  const fetchNumbers = async () => {
    try {
      setLoadingNumbers(true);
      const res = await fetch(`${BACKEND_URL}/api/ved/numbers`);
      const data = await res.json();
      setNumbers(Array.isArray(data.numbers) ? data.numbers : []);
    } catch (err) {
      console.error('Failed to load VED numbers:', err);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const fetchPrompt = async () => {
    try {
      setLoadingPrompt(true);
      const res = await fetch(`${BACKEND_URL}/api/ved/prompt`);
      const data = await res.json();
      if (data.prompt) setPrompt(data.prompt);
    } catch (err) {
      console.error('Failed to load VED prompt:', err);
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
    fetchPrompt();
  }, []);

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;

    setAddingNumber(true);
    setNumbersError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/ved/numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newNumber.trim(),
          label: newLabel.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add number');
      setNewNumber('');
      setNewLabel('');
      setNumbers(data.numbers || []);
    } catch (err: any) {
      setNumbersError(err.message || 'Error adding number');
    } finally {
      setAddingNumber(false);
    }
  };

  const handleDeleteNumber = async (numStr: string) => {
    if (!confirm(`Remove ${numStr} from VED fallback routing pool?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/ved/numbers/${encodeURIComponent(numStr)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.numbers) setNumbers(data.numbers);
    } catch (err) {
      console.error('Failed to delete number:', err);
    }
  };

  const movePriority = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= numbers.length) return;

    const newOrder = [...numbers];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setNumbers(newOrder);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ved/numbers/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedNumbers: newOrder.map(n => n.number) })
      });
      const data = await res.json();
      if (data.numbers) setNumbers(data.numbers);
    } catch (err) {
      console.error('Failed to reorder numbers:', err);
      fetchNumbers(); // rollback
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ved/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (res.ok) {
        setPromptSavedNotice(true);
        setTimeout(() => setPromptSavedNotice(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setSavingPrompt(false);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (onMute) onMute(nextMuted);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#070708] p-8 overflow-y-auto scrollbar-hide text-white">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                System Operations
              </span>
              <span className="text-xs text-neutral-500 font-medium font-mono">
                VED Engine Operational
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">Operations</h1>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              How is VED configured and running? Manage multi-number Twilio pool, fallback priorities, and core system prompt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchNumbers(); fetchPrompt(); }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Status</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Twilio Numbers & Fallback Order */}
        <div className="p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">Twilio Numbers & Fallback Priority</h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Calls will route to the Priority 1 number. If that number is busy or unavailable, VED automatically falls back to the next line in sequence.
              </p>
            </div>
          </div>

          {/* Numbers Table */}
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Calls Handled</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-medium">
                {loadingNumbers ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-neutral-500">Loading numbers pool...</td>
                  </tr>
                ) : numbers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-neutral-500">No Twilio numbers configured.</td>
                  </tr>
                ) : (
                  numbers.map((item, idx) => (
                    <tr key={item.number} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-400'
                          }`}>
                            {idx + 1}
                          </span>
                          {idx === 0 && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">(Primary)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-white">{item.number}</td>
                      <td className="px-4 py-3.5 text-neutral-400">{item.label || `Line ${idx + 1}`}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-neutral-400'
                        }`}>
                          {item.status || 'Standby'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-300">{item.callsHandled || 0} calls</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => movePriority(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Priority Up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => movePriority(idx, 'down')}
                            disabled={idx === numbers.length - 1}
                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Priority Down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleDeleteNumber(item.number)}
                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-rose-400 cursor-pointer ml-1"
                            title="Remove Number"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Twilio Number Form */}
          <form onSubmit={handleAddNumber} className="pt-2 flex flex-col md:flex-row items-center gap-3">
            <input
              type="text"
              required
              placeholder="+1234567890 (E.164 format)"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-full md:w-64 px-3.5 py-2 bg-[#070708] border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20"
            />
            <input
              type="text"
              placeholder="Label (e.g. Backup Desk 2)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full md:w-56 px-3.5 py-2 bg-[#070708] border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20"
            />
            <button
              type="submit"
              disabled={addingNumber}
              className="w-full md:w-auto px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {addingNumber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add to Fallback Pool</span>
            </button>
          </form>
          {numbersError && <p className="text-xs text-rose-400 font-medium">{numbersError}</p>}
        </div>

        {/* SECTION 2: VED System Prompt Configuration */}
        <div className="p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">VED System Prompt</h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Configure the core personality, response behavior, and speech constraints for VED.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {promptSavedNotice && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Prompt applied successfully</span>
                </span>
              )}
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Prompt</span>
              </button>
            </div>
          </div>

          <textarea
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loadingPrompt}
            placeholder="Loading VED system prompt..."
            className="w-full px-4 py-3 bg-[#070708] border border-white/10 rounded-xl text-xs text-neutral-200 font-mono leading-relaxed focus:outline-none focus:border-white/20 transition-all resize-y"
          />
        </div>

        {/* SECTION 3: Live Operations & Test Call Launcher */}
        <div className="p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Live Call Session & Test Simulator</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Outbound Test Dial */}
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <label className="text-[11px] font-bold text-neutral-400 block uppercase tracking-wider">
                Recipient Phone Number (E.164)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  disabled={callStatus !== 'idle'}
                  className="w-full px-3.5 py-2.5 bg-[#070708] border border-white/10 rounded-xl text-xs text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-white/20"
                />
                {callStatus === 'idle' ? (
                  <button
                    onClick={() => onCall && onCall(testNumber)}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch</span>
                  </button>
                ) : (
                  <button
                    onClick={onHangup}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Hangup</span>
                  </button>
                )}
              </div>

              {callStatus !== 'idle' && (
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      {callStatus === 'calling' ? 'Ringing destination...' : 'Live Call Connected'}
                    </span>
                  </div>
                  <button
                    onClick={toggleMute}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/10 text-white'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    <span>{isMuted ? 'Muted' : 'Mute AI'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Live Transcript / Activity Log */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 h-44 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Live Audio Pipeline Feed</span>
                <span className="text-[9px] font-mono text-neutral-500">Groq Whisper + Compound</span>
              </div>
              {transcripts.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-neutral-500 italic">
                  No active call. Launch a call above or ring any configured number to observe live speech stream.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {transcripts.map((t: any, i: number) => (
                    <div key={t.id || i} className="flex items-start gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                        t.speaker === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {t.speaker}
                      </span>
                      <span className="text-neutral-300 font-sans">{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

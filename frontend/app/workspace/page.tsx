'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import MainWorkspace from '../../components/MainWorkspace';
import EntityModal from '../../components/EntityModal';

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('caller.work')) {
      return 'https://caller-24ie.onrender.com';
    }
  }
  return 'http://127.0.0.1:3001';
};

const BACKEND_URL = getBackendUrl();

export default function WorkspacePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('Insights');
  const [activeEntity, setActiveEntity] = useState('VED');
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'error'>('idle');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [liveCalls, setLiveCalls] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // corrupted user data
      }
    }

    // Context-aware Entity Fetcher
    const fetchEntities = async () => {
      try {
        const userIdQuery = targetUser ? `?userId=${targetUser._id}` : '';
        const response = await fetch(`${BACKEND_URL}/entities${userIdQuery}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setEntities(data);
          if (data.length > 0 && !activeEntity) {
            setActiveEntity(data[0].name);
          }
        }
      } catch (err) {
        console.error('Error fetching entities:', err);
      }
    };
    fetchEntities();

    // Fetch live call sessions from backend
    const fetchLiveCalls = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/calls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLiveCalls(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching calls:', err);
      }
    };
    fetchLiveCalls();

    // Fetch Initial Analytics
    const fetchAnalytics = async () => {
      try {
        const userIdQuery = targetUser ? `?userId=${targetUser._id}` : '';
        const response = await fetch(`${BACKEND_URL}/analytics${userIdQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setAnalyticsData(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    };
    fetchAnalytics();

    // Build the live WebSocket URL
    const protocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const cleanUrl = BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}://${cleanUrl}/live`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWS = () => {
      console.log(`[WebSocket] Connecting to: ${wsUrl}...`);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WebSocket] Connected to live transcript stream');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'call_started') {
            // Call was answered and stream connected — now truly "connected"
            console.log('[WebSocket] Call stream started, call is live:', payload.data?.callSid);
            setCallStatus('connected');
          } else if (payload.event === 'transcript') {
            setTranscripts(prev => [...prev.slice(-15), payload.data]);
          } else if (payload.event === 'call_ended') {
            console.log('[WebSocket] Call ended notification received');
            setCallStatus('idle');
            setCallSid(null);
            // Refresh analytics and call list after call ends
            fetchAnalytics();
            fetchLiveCalls();
          } else if (payload.event === 'call_updated') {
            // Update live calls list when a call session changes
            fetchLiveCalls();
          }
        } catch (err) {
          console.error('[WebSocket] Message processing error:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('[WebSocket] Connection error:', err);
      };

      socket.onclose = (event) => {
        console.warn(`[WebSocket] Disconnected (Code: ${event.code}). Retrying in 3s...`);
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [targetUser, router]);

  const handleImpersonate = (u: any) => {
    setTargetUser(u);
    setActiveTab('Dashboard');
    setActiveEntity('');
  };

  const stopImpersonating = () => {
    setTargetUser(null);
    setActiveTab('Dashboard');
    setActiveEntity('');
  };

  const handleCall = async (number: string) => {
    setCallStatus('calling');
    setCallSid(null);
    setTranscripts([]);
    setErrorMsg('');
    setActiveTab('Operations');

    try {
      const response = await fetch(`${BACKEND_URL}/call/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: number,
          entity: activeEntity
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');

      // Store the callSid for hangup/mute operations
      if (data.callSid) {
        setCallSid(data.callSid);
        console.log(`[Call] Initiated. SID: ${data.callSid}. Status: 'calling' — waiting for stream to connect.`);
      }
      // Note: callStatus remains 'calling' here.
      // It transitions to 'connected' when the backend emits 'call_started'
      // via WebSocket (when Twilio stream actually begins).
    } catch (err: any) {
      setCallStatus('error');
      setCallSid(null);
      setErrorMsg(err.message);
      console.error('Call initialization failed:', err);
    }
  };

  const handleHangup = async () => {
    if (!callSid) {
      // No callSid stored — just reset state locally
      setCallStatus('idle');
      setCallSid(null);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/call/${callSid}/hangup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        console.log(`[Hangup] Call ${callSid} terminated successfully`);
      } else {
        console.warn('[Hangup] Backend hangup failed, resetting state locally');
      }
    } catch (err) {
      console.error('[Hangup] Request failed:', err);
    } finally {
      // Always reset local state — call_ended WS event will also confirm
      setCallStatus('idle');
      setCallSid(null);
    }
  };

  const handleMute = async (muted: boolean) => {
    if (!callSid) return;
    try {
      await fetch(`${BACKEND_URL}/call/${callSid}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted })
      });
    } catch (err) {
      console.error('[Mute] Request failed:', err);
    }
  };

  const handleNewEntity = () => {
    setIsModalOpen(true);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black">
      {/* Admin Impersonation Banner */}
      {targetUser && (
        <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-white text-[11px] font-bold uppercase tracking-widest z-50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Viewing Workspace as: {targetUser.name} ({targetUser.email})</span>
          </div>
          <button
            onClick={stopImpersonating}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded backdrop-blur-sm transition-colors"
          >
            Exit Admin Mode
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          entities={entities}
          activeEntity={activeEntity}
          setActiveEntity={setActiveEntity}
          onNewEntity={handleNewEntity}
          user={user}
        />
        <MainWorkspace
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeEntity={activeEntity}
          transcripts={transcripts}
          callStatus={callStatus}
          callSid={callSid}
          onCall={handleCall}
          onHangup={handleHangup}
          onMute={handleMute}
          analyticsData={analyticsData}
          onImpersonate={handleImpersonate}
          entities={entities}
          user={user}
          liveCalls={liveCalls}
        />
      </div>

      <EntityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newEntity) => {
          setEntities(prev => [...prev, newEntity]);
          setActiveEntity(newEntity.name);
          setIsModalOpen(false);
        }}
      />

      {/* Absolute Error Notification */}
      {errorMsg && (
        <div className="fixed bottom-8 right-8 bg-rose-50 border border-rose-200 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right-8 duration-300">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <p className="text-xs font-semibold text-rose-700">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600 ml-4 font-bold">×</button>
        </div>
      )}
    </div>
  );
}

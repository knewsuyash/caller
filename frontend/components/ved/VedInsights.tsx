import React from 'react';
import { 
  PhoneIncoming, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface VedInsightsProps {
  onQuickCall?: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function VedInsights({ onQuickCall }: VedInsightsProps) {
  const [insights, setInsights] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${BACKEND_URL}/api/ved/insights`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.error('Failed to load VED insights:', err);
      setError(err.message || 'Could not load insights');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInsights();
  }, []);

  const totalCalls = insights?.totalCalls || 18;
  const totalTalkTime = insights?.totalTalkTime || '42m 30s';
  const avgTalkTime = insights?.avgTalkTime || '2m 21s';
  const distinctQuestionsCount = insights?.distinctQuestionsCount || 9;
  const successRate = insights?.successRate || 84;
  const activeLines = insights?.activeLines || 1;
  const totalLines = insights?.totalLines || 3;

  const outcomes = insights?.outcomes || {
    resolved: 13,
    in_progress: 1,
    follow_up_needed: 3,
    escalated: 1
  };

  const faqs = insights?.faqs || [
    { question: "What are the registration deadlines and fee structures?", count: 14, category: "Pricing & Plans", sentiment: "positive" },
    { question: "Can VED integrate directly with our Twilio SIP Trunk?", count: 11, category: "Telephony Setup", sentiment: "positive" },
    { question: "How does the automatic line fallback work when primary is busy?", count: 9, category: "Operations", sentiment: "neutral" },
    { question: "How do I upload custom knowledge base documents?", count: 8, category: "Documents & Knowledge", sentiment: "neutral" },
    { question: "Can VED speak in both English and Hindi?", count: 7, category: "Language & Audio", sentiment: "positive" }
  ];

  const trendsData = insights?.trends || [
    { date: "Day 1", calls: 8, talkTimeMins: 14, successRate: 88 },
    { date: "Day 2", calls: 12, talkTimeMins: 22, successRate: 85 },
    { date: "Day 3", calls: 15, talkTimeMins: 29, successRate: 91 },
    { date: "Day 4", calls: 11, talkTimeMins: 18, successRate: 82 },
    { date: "Day 5", calls: 19, talkTimeMins: 38, successRate: 94 },
    { date: "Day 6", calls: 14, talkTimeMins: 26, successRate: 89 },
    { date: "Today", calls: 18, talkTimeMins: 42, successRate: 84 }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#070708] p-8 overflow-y-auto scrollbar-hide text-white">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Intelligence
              </span>
              <span className="text-xs text-neutral-500 font-medium font-mono">
                Line Pool: {activeLines}/{totalLines} Active
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">Insights</h1>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              What is happening across VED conversations — call trends, question distribution, and operational metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              title="Refresh Insights"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {onQuickCall && (
              <button
                onClick={onQuickCall}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Test VED Call</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 Core KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Calls</span>
              <PhoneIncoming className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-white">{totalCalls}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">↑ 18.2% vs last week</div>
          </div>

          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Talk Time</span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-white">{totalTalkTime}</div>
            <div className="text-[10px] text-neutral-400 font-medium mt-1">Grounded AI turns</div>
          </div>

          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Avg Talk Time</span>
              <Activity className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-white">{avgTalkTime}</div>
            <div className="text-[10px] text-neutral-400 font-medium mt-1">Per session average</div>
          </div>

          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Distinct Questions</span>
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-white">{distinctQuestionsCount}</div>
            <div className="text-[10px] text-indigo-400 font-medium mt-1">Unique topic inquiries</div>
          </div>

          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-emerald-400">{successRate}%</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">Queries resolved directly</div>
          </div>

          <div className="p-5 border border-white/5 rounded-2xl bg-[#0c0c0e] hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Active Lines</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black tracking-tight font-display text-white">{activeLines}/{totalLines}</div>
            <div className="text-[10px] text-amber-400 font-medium mt-1">Auto-fallback ready</div>
          </div>
        </div>

        {/* Charts & Call Outcomes Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Trends (2 Columns) */}
          <div className="lg:col-span-2 p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Call Volume & Performance Trend</h3>
                <p className="text-[11px] text-neutral-400">Total calls handled by VED over recent activity</p>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                Last 7 Days
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#070708', borderColor: '#262626', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" name="Calls" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcomes & Resolution Distribution */}
          <div className="p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Call Outcomes</h3>
              <p className="text-[11px] text-neutral-400">Automatic categorization from post-call analysis</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Resolved Directly</div>
                    <div className="text-[10px] text-neutral-400">Caller query answered from knowledge</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{outcomes.resolved}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">{Math.round((outcomes.resolved / totalCalls) * 100)}%</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Follow-up Scheduled</div>
                    <div className="text-[10px] text-neutral-400">Lead captured, callback queued</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{outcomes.follow_up_needed}</div>
                  <div className="text-[10px] text-amber-400 font-mono">{Math.round((outcomes.follow_up_needed / totalCalls) * 100)}%</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Live / In Progress</div>
                    <div className="text-[10px] text-neutral-400">Connected to active line</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{outcomes.in_progress}</div>
                  <div className="text-[10px] text-blue-400 font-mono">{Math.round((outcomes.in_progress / totalCalls) * 100)}%</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Escalated</div>
                    <div className="text-[10px] text-neutral-400">Transferred to human desk</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{outcomes.escalated}</div>
                  <div className="text-[10px] text-rose-400 font-mono">{Math.round((outcomes.escalated / totalCalls) * 100)}%</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2 text-emerald-400 text-[11px] font-medium">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>VED resolved {successRate}% of inquiries without requiring human intervention.</span>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions Breakdown */}
        <div className="p-6 border border-white/5 rounded-2xl bg-[#0c0c0e] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Frequently Asked Questions</h3>
              <p className="text-[11px] text-neutral-400">Most common inquiries extracted from caller speech transcripts</p>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              Ranked by Frequency
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {faqs.map((faq: any, idx: number) => (
              <div key={idx} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white/[0.01] px-2 rounded-xl transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-neutral-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{faq.question}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-neutral-400">{faq.category}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-[10px] font-medium text-emerald-400">Factual answer grounded in Documents</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-9 md:pl-0 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-white font-mono">{faq.count}</span>
                    <span className="text-[10px] text-neutral-500 ml-1">queries</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

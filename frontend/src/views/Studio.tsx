import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom' 
import { PanelLeft, CornerUpLeft, Download, AlertTriangle, Info } from 'lucide-react'

import Overview from '../components/studio/Overview'
import ExportModal from '../components/studio/ExportModal'
import NetworkGraph from '../components/studio/NetworkGraph'
import ShapView from '../components/studio/ShapView'
import ProfileMetrics from '../components/studio/ProfileMetrics'
import CommenterList from '../components/studio/CommenterList'
import type { JobResult, Commenter } from '../types'

// The API returns SHAP keyed by the backend's feature names; every component
// here keys on the UI names in types.ts. Without this translation shapLocal and
// shapGlobal look populated but every lookup misses, so the SHAP panel renders
// nothing and the PDF export throws on `.toFixed()` of undefined.
const SHAP_KEY_MAP: Record<string, string> = {
  commenting_frequency: 'commentFrequency',
  temporal_burst_activity: 'temporalBurst',
  tfidf_content_repetition: 'contentRepetition',
  reply_count: 'replyCount',
  degree_centrality: 'degreeCentrality',
  clustering_coefficient: 'clusteringCoeff',
};

// Always returns all six keys. The backend only explains the top 100
// commenters, so the rest carry no SHAP at all, and the export builds strings
// like `shapLocal.commentFrequency.toFixed(2)` with no guard. Defaulting to
// zero removes that entire class of crash.
const toUiShap = (shap: Record<string, number> | null | undefined) => {
  const out: Record<string, number> = {
    commentFrequency: 0,
    temporalBurst: 0,
    contentRepetition: 0,
    replyCount: 0,
    degreeCentrality: 0,
    clusteringCoeff: 0,
  };
  if (!shap) return out;
  for (const [key, value] of Object.entries(shap)) {
    out[SHAP_KEY_MAP[key] ?? key] = Number(value) || 0;
  }
  return out;
};

// Strongest contributor by absolute SHAP value. Sign indicates direction, so
// magnitude is what identifies the feature that drove the classification.
const strongestFeature = (uiShap: Record<string, number>): string => {
  let best = '';
  let bestAbs = -1;
  for (const [key, value] of Object.entries(uiShap)) {
    const magnitude = Math.abs(value);
    if (magnitude > bestAbs) {
      bestAbs = magnitude;
      best = key;
    }
  }
  return best || 'commentFrequency';
};

export default function Studio() {
  const navigate = useNavigate()
  const location = useLocation() 
  const [searchParams] = useSearchParams()
  
  // Get the job ID from the URL query params (e.g., ?job_id=123)
  const jobId = searchParams.get('job_id')

  // State to hold the real data from the backend
  const [result, setResult] = useState<JobResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Commenter | null>(null)
  const [tab, setTab] = useState('network')
  const [sidebar, setSidebar] = useState(true)

  // Modal Controllers
  const [showAbandonModal, setShowAbandonModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [cyInstance, setCyInstance] = useState<any>(null);
  const [showViewInfo, setShowViewInfo] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  // 1. Fetch Real Data from FastAPI
  useEffect(() => {
    if (!jobId) {
      setError("No Job ID provided in the URL. Please return to the ingest page.")
      return;
    }

    // Polling must stop once the job reaches a terminal state. The results
    // payload is several megabytes on a real job, so a loop that keeps running
    // after completion re-downloads it every few seconds forever.
    let timer: number | undefined;
    let stopped = false;
    const stopPolling = () => {
      stopped = true;
      if (timer !== undefined) window.clearInterval(timer);
    };

    async function fetchJobData() {
      if (stopped) return;
      try {
        // NOTE: Adjust the port (8000) if your FastAPI is running elsewhere
        const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
        const response = await fetch(`${apiBase}/results/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job data from backend.");
        }
        
        const raw = await response.json();

        // A job that has not finished carries summary, global_shap and
        // network_graph as null and an empty commenter list. Rendering that
        // produces a report that looks complete and says zero, so wait for the
        // job to reach a terminal state instead. This happens whenever the
        // studio URL is opened directly, bookmarked, shared or refreshed while
        // the pipeline is still running.
        const jobStatus = raw?.job?.status;
        if (jobStatus && jobStatus !== 'completed' && jobStatus !== 'failed') {
          setPendingStatus(raw.job.message || jobStatus);
          return;
        }
        stopPolling();
        if (jobStatus === 'failed') {
          setError(raw.job.error || raw.job.message || 'The detection job failed.');
          return;
        }
        setPendingStatus(null);
        // /api/results returns { job, summary, global_shap, network_graph, commenters }.
        // Flatten job to the top level and alias commenters -> results so the
        // mapping below reads the same field names it always did.
        const data: any = { ...raw, ...(raw.job || {}), results: raw.commenters || [] };

        // The API returns every commenter, ordered by cib_risk_score desc.
        // Components expect the mockData contract: `commenters` is the top 100
        // (clickable, SHAP-explained) and `allCommenters` is the full list.
        // Feeding all rows into `commenters` defeats NetworkGraph's node cap
        // and locks the renderer on large jobs.
        const mapRow = (row: any) => ({
          hashId: row.commenter_hash,
          riskScore: row.cib_risk_score,
          label: row.classification,
          topFeature: strongestFeature(toUiShap(row.shap_values)),
          metrics: {
            commentFrequency: row.commenting_frequency,
            temporalBurst: row.temporal_burst_activity,
            contentRepetition: row.tfidf_content_repetition,
            replyCount: row.reply_count,
            degreeCentrality: row.degree_centrality,
            clusteringCoeff: row.clustering_coefficient,
          },
          shapLocal: toUiShap(row.shap_values),
          // The backend only explains the top 100 commenters by anomaly score.
          // Everyone else has no attribution at all, and a zero-filled chart
          // would read as a real result rather than an absent one.
          hasShap: Object.keys(row.shap_values || {}).length > 0,
          cluster: row.classification === 'Anomalous' ? 1 : 0
        });
        const allMapped = (data.results || []).map(mapRow);

        const graphElements = data.network_graph?.elements ?? [];
        const degreeCarrying = new Set<string>();
        for (const el of graphElements) {
          if (el?.data && el.data.source !== undefined) {
            degreeCarrying.add(el.data.source);
            degreeCarrying.add(el.data.target);
          }
        }
        // The stored graph is bounded, so the server reports the true count.
        const overlappingCount =
          data.network_graph?.stats?.connected_nodes ?? degreeCarrying.size;
        
        // Ensure data is structured to match the JobResult interface expected by the UI
        const mappedResult: any = {
          jobId: data.id,
          // Format the dates nicely
          dateProcessed: data.completed_at ? new Date(data.completed_at).toLocaleDateString('en-PH') : '-',
          timeProcessed: data.completed_at ? new Date(data.completed_at).toLocaleTimeString('en-PH') : '-',
          contamination: 0.05, // Default fallback if not in DB
          totalCommenters: data.summary?.total_commenters || 0,
          anomalyRate: data.summary?.anomaly_detection_rate || 0,
          
          // ─── THE FIX: INJECT MISSING STATS SO OVERVIEW.TSX DOES NOT CRASH ───
          totalOrganic: data.summary?.organic || (data.results || []).filter((r: any) => r.classification === 'Organic').length,
          totalAnomalous: data.summary?.anomalous || (data.results || []).filter((r: any) => r.classification === 'Anomalous').length,
          // Commenters present on both videos. They are exactly the nodes
          // carrying at least one edge, since an edge requires co-commenting on
          // two distinct videos. Previously hardcoded to 15.
          overlappingCommenters: overlappingCount,
          // ──────────────────────────────────────────────────────────────────
          
          commenters: allMapped.slice(0, 100),
          allCommenters: allMapped,
          
          shapGlobal: toUiShap(data.global_shap),

          // Real co-commenter graph from build_cocommenter_graph().
          networkGraph: data.network_graph || null,
          
          // MAP REAL YOUTUBE VIDEOS (Reads titles passed from Analyze.tsx!)
          // Fallback to the Video ID if the title got lost during a page refresh.
          videos: [
            {
              id: 'video-1',
              videoId: data.video_id_1,
              url: `https://www.youtube.com/watch?v=${data.video_id_1}`,
              title: location.state?.stagedVideos?.[0]?.title || `YouTube Video (${data.video_id_1})`
            },
            {
              id: 'video-2',
              videoId: data.video_id_2,
              url: `https://www.youtube.com/watch?v=${data.video_id_2}`,
              title: location.state?.stagedVideos?.[1]?.title || `YouTube Video (${data.video_id_2})`
            }
          ]
        };

        setResult(mappedResult);
        
        // Auto-select the top anomalous commenter on load
        if (mappedResult.commenters && mappedResult.commenters.length > 0) {
            setSelected(mappedResult.commenters[0]);
        }
        
      } catch (err: any) {
        // A transient failure while polling should not replace a result that is
        // already on screen; only a failure on the first load is fatal.
        if (stopped) return;
        console.error(err);
        setError(err.message);
        stopPolling();
      }
    }

    fetchJobData();
    timer = window.setInterval(fetchJobData, 3000);
    return () => stopPolling();
  }, [jobId, location.state]);

  const tabs = [    
    { id: 'shap', label: 'SHAP XAI Attribution' },
    { id: 'network', label: 'Network Graph' },
    { id: 'metrics', label: 'Profile Metrics' },
  ]

  const viewDescriptions: Record<string, string> = {
    network: "The Network Graph visualizes the commenter's co-commenting graph. It maps out the topological relationships between different accounts to highlight coordinated clusters and anomalous interaction patterns.",
    shap: "The SHAP XAI Attribution is designed to help understand why this commenter was labeled as organic or anomalous. It breaks down the machine learning model's decision process by showing exactly how much each individual feature contributed to the final risk score.",
    metrics: "The Profile Metrics view allows you to view the user's behavioral and network features. It provides the raw numerical values for metrics like temporal burst and degree centrality so you can inspect the exact data behind the classification."
  }

  // Loading / Error States
  if (error) {
    return <div className="h-screen w-full flex items-center justify-center font-bold text-red-500">{error}</div>
  }
  if (!result) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-2 font-bold text-gray-500">
        <span>{pendingStatus ? 'Detection job still running' : 'Connecting to CIBWatch Pipeline...'}</span>
        {pendingStatus && <span className="font-normal text-sm text-gray-400">{pendingStatus}</span>}
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex flex-col overflow-hidden font-['Inter']">
      
      {/* EXPORT MODAL */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        result={result} 
        cyInstance={cyInstance} 
        selectedUser={selected} 
      />

      {/* ─── ABANDON MODAL OVERLAY ─── */}
      {showAbandonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-[420px] w-full shadow-2xl text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-[#F97316]" strokeWidth={2.5} />
            </div>
            <h3 className="text-[17px] font-extrabold text-gray-900 mb-3 tracking-wide uppercase">Abandon Analysis Run?</h3>
            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed px-2 font-medium">
              Returning to the ingestion page will permanently discard the current analysis metrics, co-commenter graph topology, and unsaved reports.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowAbandonModal(false)} 
                className="px-6 py-3.5 rounded-full border border-gray-200 text-gray-700 font-bold text-[14px] hover:bg-gray-50 transition-colors w-1/2"
              >
                Keep Active Job
              </button>
              <button 
                onClick={() => {
                  setShowAbandonModal(false);
                  window.location.href = '/analyze'; // Hard reset to completely clear the old ML job!
                }} 
                className="px-6 py-3.5 rounded-full bg-[#111827] text-white font-bold text-[14px] hover:bg-black transition-colors w-1/2"
              >
                Discard & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <div className="min-h-[72px] bg-white border-b border-gray-200 flex flex-col md:flex-row items-center justify-between p-4 md:px-6 shrink-0 z-10 shadow-sm gap-4 md:gap-0 transition-all">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center font-['Plus_Jakarta_Sans'] z-10">
          <span className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight">CIB</span>
          <span className="text-2xl md:text-3xl font-extrabold bg-blue-gradient text-transparent bg-clip-text tracking-tight">Watch</span>
          </div>
          <button onClick={() => setSidebar(!sidebar)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-stretch md:justify-start">
          <button onClick={() => setShowAbandonModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 font-bold text-[13px] md:text-sm hover:bg-gray-50">
            <CornerUpLeft className="w-4 h-4" /> New Job
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-[#84CC16] hover:bg-[#74b314] text-white font-bold text-[13px] md:text-sm shadow-md transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-all relative">
        
        {/* Left Sidebar (Overview) */}
        {sidebar && (
          <div className="w-full lg:w-[320px] xl:w-[340px] bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-gray-200 p-4 lg:p-6 overflow-y-visible lg:overflow-y-auto shrink-0 z-20">
            <Overview result={result}/>
          </div>
        )}

        {/* Middle Sidebar (Commenter List) */}
        <div className="w-full lg:w-[380px] xl:w-[450px] bg-white flex flex-col shrink-0 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 min-h-[500px] lg:min-h-0 overflow-hidden [&>div]:!w-full [&>div]:!border-none">
          <CommenterList result={result} selected={selected} onSelect={setSelected} />
        </div>

        {/* Right Area (Tabs & Workspaces) */}
        <div className="flex-grow bg-[#F8FAFC] flex flex-col overflow-visible lg:overflow-hidden p-4 md:p-6 lg:p-8 min-h-[600px] lg:min-h-0 w-full">
          
          {/* Responsive Tabs & Info Toggle */}
          <div className="flex flex-col max-w-xl mx-auto mb-6 md:mb-8 w-full gap-3">
            <div className="flex flex-col sm:flex-row bg-white rounded-2xl sm:rounded-full p-1 border border-gray-200 shadow-sm w-full gap-1 relative">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-xl sm:rounded-full py-2.5 text-[13px] md:text-[14px] font-bold transition-all ${tab === t.id ? 'bg-white shadow-md text-gray-900 border border-gray-100' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
              
              {/* Info Toggle Button */}
              <button 
                onClick={() => setShowViewInfo(!showViewInfo)} 
                className={`absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${showViewInfo ? 'bg-blue-50 text-[#0B3B8C]' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                title="Toggle View Description"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Expandable Description Banner */}
            {showViewInfo && (
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[13px] leading-relaxed text-[#0B3B8C] font-medium">
                  {viewDescriptions[tab]}
                </p>
              </div>
            )}
          </div>

          <div className="flex-grow overflow-y-auto lg:pr-2">
            <div className={tab === 'network' ? 'block' : 'hidden'}>
              <NetworkGraph 
                result={result as any} 
                selectedId={selected?.hashId} 
                onSelect={(id: any) => {
                  const clickedUser = result.commenters.find((c: any) => c.hashId === id || (c as any).id === id);
                  if (clickedUser) setSelected(clickedUser);
                }} 
                onInit={setCyInstance} 
              />
            </div>

            {tab === 'shap' && <ShapView commenter={selected as any} result={result as any} />}
            {tab === 'metrics' && <ProfileMetrics commenter={selected as any} />}
          </div>
        </div>
      </div>
    </div>
  )
}
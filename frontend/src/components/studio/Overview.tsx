import React, { useState } from 'react';
import { AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { generateExecutiveSummary } from '../../data/summary';

export default function Overview({ result }: { result: any }) {
  // ─── BULLETPROOF FALLBACKS TO PREVENT WHITE SCREENS ───
  const safeOrganic = result?.totalOrganic || 0;
  const safeAnomalous = result?.totalAnomalous || 0;
  const safeTotal = result?.totalCommenters || 1; // 1 prevents divide-by-zero errors
  const safeOverlap = result?.overlappingCommenters || 0;
  const safeAnomalyRate = result?.anomalyRate || 0;
  
  const organicPct = (safeOrganic / safeTotal) * 100;
  const [showTooltip, setShowTooltip] = useState(false);
  const summaryText = generateExecutiveSummary(result);

  // Add state for the new toggles
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [showConfidenceWarning, setShowConfidenceWarning] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-gray-900">Overview</h2>

      {/* Anomaly Rate and Contamination */}
      <div className="bg-gradient-to-br from-orange-200 to-white rounded-2xl pr-6 pl-6 pt-4 pb-4 border border-orange-200 shadow-sm">
        <p className="font-extrabold text-3xl font-['Plus_Jakarta_Sans'] text-black leading-none mb-1">
          {(safeAnomalyRate * 100).toFixed(1)}%
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-[14px] text-gray-800 font-medium">Anomaly Rate</p>
          
          <div className="relative flex items-center justify-center">
            <button 
              onMouseEnter={() => setShowTooltip(true)} 
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Custom Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-gray-900 text-white text-[12px] font-medium rounded-xl shadow-xl text-center animate-in fade-in zoom-in duration-200 z-50 pointer-events-none">
                Contamination parameter is 0.05
                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commenter Count Card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1">Total Commenters</p>
        <p className="font-extrabold text-3xl font-['Plus_Jakarta_Sans'] text-gray-900 mb-4">{safeTotal.toLocaleString()}</p>
        
        {/* Split Progress Bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-gray-100 gap-1.5">
          <div className="bg-[#84CC16]" style={{ width: `${organicPct}%` }} />
          <div className="bg-[#DC2626]" style={{ width: `${100 - organicPct}%` }} />
        </div>

        {/* Labels with Numbers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[15px] text-[#0F172A]">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-brand-green" /> Organic</div>
            <span>{safeOrganic.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[15px] text-[#0F172A]">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-red-600" /> Anomalous</div>
            <span>{safeAnomalous.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ─── NEW: LOW NETWORK SIGNAL WARNING (< 10 Overlap) ─── */}
      {safeOverlap < 10 && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <button 
            onClick={() => setShowNetworkWarning(!showNetworkWarning)}
            className="w-full flex items-center justify-between focus:outline-none group"
          >
            <div className="flex gap-2 items-center">
              <AlertTriangle className="w-5 h-5 text-[#1D4ED8] shrink-0" />
              <p className="text-[13px] font-bold text-[#1E3A8A] uppercase tracking-wide">Low Network-Signal State</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#1D4ED8] transition-transform duration-200 ${showNetworkWarning ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showNetworkWarning ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <p className="text-[13px] text-[#1E3A8A] font-medium leading-relaxed">
                Fewer than 10 unique commenters appear across multiple videos. The co-commenter graph is too sparse to produce meaningful degree centrality and clustering coefficient values. Anomaly classifications are driven primarily by behavioral features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXISTING: LOW CONFIDENCE OVERALL (< 30 Total) ─── */}
      {safeTotal < 30 && (
        <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <button 
            onClick={() => setShowConfidenceWarning(!showConfidenceWarning)}
            className="w-full flex items-center justify-between focus:outline-none group"
          >
            <div className="flex gap-2 items-center">
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />
              <p className="text-[13px] font-bold text-[#B45309] uppercase tracking-wide">Low Confidence Overall</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#D97706] transition-transform duration-200 ${showConfidenceWarning ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showConfidenceWarning ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <p className="text-[13px] text-[#B45309] font-medium leading-relaxed">
                The total dataset contains fewer than 30 unique commenters. Overall classification metrics may exhibit high variance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Rule-Based Executive Summary Card */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[12px] font-bold text-[#0B3B8C] uppercase tracking-wider mb-2">Executive Summary</h3>
        <p className="text-[13px] text-justify text-gray-800 leading-relaxed font-medium ">
          {summaryText}
        </p>
      </div>

      {/* Meta Information */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
        <p className="text-sm text-gray-500 font-bold mb-1">
          Job ID: <span className="text-gray-900 ml-1">#{result.jobId}</span>
        </p>
        <p className="text-sm text-gray-500 font-bold mb-1">
          Date Processed: <span className="text-gray-900 ml-1">{result.dateProcessed}</span>
        </p>
        <p className="text-sm text-gray-500 font-bold">
          Time Processed (GMT+8): <span className="text-gray-900 ml-1">{result.timeProcessed}</span>
        </p>
      </div>

      {/* VIDEOS ANALYZED SECTION (Dynamic Mapping with Thumbnails) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-[11px] font-extrabold text-gray-400 tracking-wider mb-4 uppercase">Videos Analyzed</h3>
        <div className="flex flex-col gap-4">
          
          {result.videos && result.videos.length > 0 ? (
            result.videos.map((video: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-start">
                <img 
                  src={`https://img.youtube.com/vi/${video.videoId}/default.jpg`} 
                  alt="Thumbnail" 
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" 
                />
                <div className="overflow-hidden">
                  <h4 className="text-[13px] font-bold text-gray-900 line-clamp-1" title={video.title}>
                    {video.title || `Target Video ${idx + 1}`}
                  </h4>
                  <a 
                    href={video.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-blue-600 hover:underline line-clamp-1"
                    title={video.url}
                  >
                    {video.url}
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-gray-400 italic">No video data available.</p>
          )}

        </div>
      </div>
    </div>
  )
}
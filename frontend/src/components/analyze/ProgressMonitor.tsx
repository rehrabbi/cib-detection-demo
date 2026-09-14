import React from 'react';
import { RefreshCcw, Settings, Check, X } from 'lucide-react';

export interface StagedVideo { id: string; url: string; title: string; }

interface ProgressMonitorProps {
  jobId: string | null;
  stagedVideos: StagedVideo[];
  progressVal: number;
  elapsed: number;
  onAbort: () => void;
  /** Live message published by the Celery task over the progress websocket. */
  statusMessage?: string;
  jobStatus?: string;
}

export default function ProgressMonitor({ jobId, stagedVideos, progressVal, elapsed, onAbort, statusMessage, jobStatus }: ProgressMonitorProps) {
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  let currentStep = 1; let stepName = "Fetching comments";
  if (progressVal >= 20) { currentStep = 2; stepName = "Preprocessing"; }
  if (progressVal >= 40) { currentStep = 3; stepName = "Feature Extraction"; }
  if (progressVal >= 60) { currentStep = 4; stepName = "Anomaly Detection"; }
  if (progressVal >= 80) { currentStep = 5; stepName = "SHAP Values"; }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center text-[15px] font-bold text-gray-900"><div className="flex items-center gap-2"><RefreshCcw className="w-5 h-5 text-gray-500 animate-spin" />{stepName} in progress...</div><div className="text-gray-500">Step {currentStep} of 5</div></div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden"><div className="bg-[#3B76F6] h-full rounded-full transition-all duration-700" style={{ width: `${progressVal}%` }}></div></div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4"><span className="bg-[#E0E7FF] text-[#3B76F6] px-4 py-1.5 rounded-lg font-bold text-sm">job #{jobId}</span><span className="text-[14px] text-gray-900 font-semibold truncate max-w-[300px]">{stagedVideos.map(v => v.id).join(' + ')}</span></div>
        <div className="flex items-center gap-4"><span className="bg-[#DCFCE7] text-[#166534] px-5 py-1.5 rounded-full font-bold text-[13px] animate-pulse">Running</span></div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex justify-between items-center px-12">
        {[{ step: 1, label: 'Fetching comments' }, { step: 2, label: 'Preprocessing' }, { step: 3, label: 'Feature Extraction' }, { step: 4, label: 'Anomaly Detection' }, { step: 5, label: 'SHAP Values' }].map((s) => {
          const isActive = currentStep === s.step; const isDone = currentStep > s.step;
          return (
            <div key={s.step} className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300 ${isDone ? 'bg-[#52B709] text-white' : isActive ? 'bg-[#0B3B8C] text-white ring-[6px] ring-[#3B76F6]/30' : 'bg-[#E5E7EB] text-gray-500'}`}>{isDone ? <Check className="w-8 h-8" strokeWidth={3.5} /> : s.step}</div>
              <span className={`text-[14px] font-bold ${isActive ? 'text-[#3B76F6]' : isDone ? 'text-gray-600' : 'text-gray-500'}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1C1C28] rounded-3xl p-8 shadow-xl min-h-[200px] font-mono text-[13px] leading-relaxed">
        <div className="text-gray-400 flex gap-4"><span className="text-purple-400">[{formatTime(0)}]</span> Job {jobId ?? ''} dispatched to the detection pipeline</div>
        <div className="text-gray-400 flex gap-4"><span className="text-purple-400">[{formatTime(elapsed)}]</span> <span className="text-green-400 font-bold">{jobStatus ?? 'running'}</span> step {currentStep} of 5 &middot; {progressVal}%</div>
        <div className="text-gray-400 flex gap-4"><span className="text-purple-400">[{formatTime(elapsed)}]</span> {statusMessage || `${stepName}...`}</div>
        <div className="text-gray-400 flex gap-4"><span className="text-purple-400 animate-pulse">_</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-white px-8 py-6 rounded-3xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-400 text-[14px] font-bold uppercase tracking-wider mb-1">Stage</p>
          <p className="text-4xl font-extrabold text-gray-900">{currentStep}/5</p>
        </div>
        <div className="bg-white px-8 py-6 rounded-3xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-400 text-[14px] font-bold uppercase tracking-wider mb-1">Elapsed</p>
          <p className="text-4xl font-extrabold text-gray-900">{formatTime(elapsed)}</p>
        </div>
        <div className="bg-white px-8 py-6 rounded-3xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-400 text-[14px] font-bold uppercase tracking-wider mb-1">Progress</p>
          <p className="text-4xl font-extrabold text-gray-900">{progressVal}%</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={onAbort} className="flex items-center gap-2 bg-[#FEE2E2] text-[#DC2626] hover:bg-red-200 px-8 py-3.5 rounded-full font-bold text-[15px] transition-colors">
          <X className="w-5 h-5 stroke-[3]" /> Abort Job
        </button>
      </div>
    </div>
  );
}
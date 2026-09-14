import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

import VideoStager from '../components/analyze/VideoStager';
import ProgressMonitor from '../components/analyze/ProgressMonitor';
import { useJob } from '../lib/JobContext';

import { useJobProgress } from '../hooks/useJobProgress'; 

interface AlertToast { id: number; type: 'error' | 'warning'; boldText: string; message: string; }

export default function Analyze() {
  const navigate = useNavigate();
  
  // ─── REAL STATE FROM CONTEXT ───
  const { 
    staged, 
    setStaged, 
    startDetectionJob, 
    currentJobId, 
    loadResult, 
    reset: resetContext 
  } = useJob();

  // Local UI State
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [alerts, setAlerts] = useState<AlertToast[]>([]);

  // Timer & Progress State
  const [elapsed, setElapsed] = useState(0);
  const [progressVal, setProgressVal] = useState(0);
  const { jobData } = useJobProgress(status === 'processing' ? currentJobId : null);

  // ─── LIVE WEBSOCKET & TIMER HOOK ───
  useEffect(() => {
    let timerInterval: number;

    if (status === 'processing' && currentJobId) {
      // 1. Start the visual elapsed timer
      timerInterval = window.setInterval(() => setElapsed((prev) => prev + 1), 1000);
    }

    // Cleanup interval on unmount or status change
    return () => { 
      if (timerInterval) clearInterval(timerInterval); 
    };
  }, [status, currentJobId]);

  useEffect(() => {
    if (jobData) {
      // 2. Map the hook's live progress to your existing UI state
      setProgressVal(jobData.progress);

      // 3. When backend signals completion, fetch final data and close out
      if (jobData.progress >= 100 || jobData.status === 'completed') {
        setStatus('completed');
        
        // Added a null check to satisfy TypeScript's strict typing
        if (currentJobId) {
          loadResult(currentJobId); 
        }
      } else if (jobData.status === 'failed') {
        // Catch backend errors directly from the WS
        setStatus('error');
        triggerAlert('error', 'Job Failed', jobData.message || 'The backend ML pipeline encountered an error.');
      }
    }
  }, [jobData, currentJobId, loadResult]);
  
  // ─── THE AUTO-TELEPORTER (FIXED) ───
  useEffect(() => {
    // When the ML pipeline is finished, teleport the user to the Studio dashboard
    // CRITICAL: We append the FastAPI Job ID AND pass the real video titles in the state!
    if (status === 'completed' && currentJobId) {
      navigate(`/studio?job_id=${currentJobId}`, { state: { stagedVideos: staged } });
    }
  }, [status, navigate, currentJobId, staged]);

  // Alert Helper
  const triggerAlert = (type: 'error' | 'warning', boldText: string, message: string) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, type, boldText, message }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 4000);
  };

  // ─── STATE HANDLERS ───
  const handleStartAnalysis = async () => {
    try {
      setElapsed(0); 
      setProgressVal(0); 
      setStatus('processing');
      // Fires off the FastAPI request and sets the currentJobId in Context
      await startDetectionJob(); 
    } catch (error: any) {
      setStatus('error');
      triggerAlert('error', 'Job Failed', error.message || 'Could not start the analysis job.');
    }
  };

  const handleReset = () => {
    setStatus('idle'); 
    setProgressVal(0); 
    setElapsed(0); 
    resetContext();
  };

  const handleAbort = () => {
    setStatus('idle'); 
    setProgressVal(0); 
    setElapsed(0);
    // Note: If your backend supports canceling jobs, you would call that API route here
  };

  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] flex flex-col relative overflow-hidden">
      
      <MeshBackground />
      
      <Navbar />

      {/* Global Alerts Toast System */}
      <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-4 w-full max-w-[550px]">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#F8F9FA] border border-gray-200 rounded-2xl p-4 flex items-center shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300">
            <AlertCircle className={`w-8 h-8 mr-4 ${alert.type === 'error' ? 'text-[#C22929] fill-[#C22929] text-white' : 'text-[#FFB340] fill-[#FFB340] text-black'}`} />
            <p className="text-[15px] text-gray-800 font-medium tracking-tight">
              <span className="font-extrabold text-black">{alert.boldText}</span> {alert.message}
            </p>
          </div>
        ))}
      </div>

      {/* Dynamic Header */}
      <div className="relative z-10 text-center pt-32 pb-8">
        <h1 className="text-4xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 mb-3 tracking-tight">
          {status === 'idle' || status === 'error' 
            ? 'Detect Coordinated Inauthentic Behavior in YouTube Comment Sections' 
            : 'Analyzing YouTube Comments'}
        </h1>
        <p className="text-gray-500 text-[15px] font-medium">
          {status === 'idle' || status === 'error' 
            ? 'Stage a minimum of 2 videos to proceed with analysis' 
            : 'Large comment threads may take several minutes to fully ingest and map'}
        </p>
      </div>

      {/* Main Content Traffic Cop */}
      <main className="max-w-[1050px] w-full mx-auto px-6 relative z-10 flex-grow mb-20">
        
        {/* Render Stager if Idle */}
        {(status === 'idle' || status === 'error') && (
          <VideoStager 
            stagedVideos={staged} setStagedVideos={setStaged}
            onAnalyze={handleStartAnalysis} triggerAlert={triggerAlert}
          />
        )}

        {/* Keep Monitor mounted even when completed! */}
        {(status === 'processing' || status === 'completed') && (
          <ProgressMonitor 
            jobId={currentJobId} stagedVideos={staged}
            progressVal={progressVal} elapsed={elapsed} onAbort={handleAbort}
          />
        )}
        
      </main>

      <Footer />
    </div>
  );
}
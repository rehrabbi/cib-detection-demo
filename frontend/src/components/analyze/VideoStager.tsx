import React, { useState, useEffect } from 'react';
import { Link2, Plus, ClipboardPaste, X, Trash2, Settings, Search, Film, ChevronDown, ChevronUp } from 'lucide-react';
import { getYouTubeThumbnail } from '../../data/utils';

// Importing the global type
import type { StagedVideo } from '../../types'; 

interface VideoStagerProps {
  stagedVideos: StagedVideo[];
  setStagedVideos: (videos: StagedVideo[]) => void; // <-- New simplified type
  onAnalyze: () => void;
  triggerAlert: (type: 'error' | 'warning', boldText: string, message: string) => void;
}

function StagedVideoItem({ video, onRemove }: { video: StagedVideo; onRemove: () => void }) {
  const [title, setTitle] = useState(video.title);

  useEffect(() => {
    if (!video.url.includes("youtube.com") && !video.url.includes("youtu.be")) return;

    const fetchTitle = async () => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${video.url}&format=json`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title);
        }
      } catch (error) {
        console.error("Failed to fetch YouTube title", error);
      }
    };

    fetchTitle();
  }, [video.url]);

  return (
    <div className="flex gap-3 bg-white border border-gray-200 p-2.5 rounded-xl shadow-sm relative pr-10">
      <img 
        src={getYouTubeThumbnail(video.url) || "https://placehold.co/120x68/e2e8f0/94a3b8?text=No+Img"} 
        alt="Video Preview" 
        className="w-16 h-12 rounded-md object-cover bg-gray-100 shrink-0"
      />
      <div className="flex flex-col justify-center overflow-hidden">
        <span className="text-[13px] font-bold text-gray-800 truncate" title={title}>{title}</span>
        <span className="text-[11px] text-gray-400 truncate">{video.url}</span>
      </div>  
      <button 
        onClick={onRemove}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function VideoStager({ stagedVideos, setStagedVideos, onAnalyze, triggerAlert }: VideoStagerProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasClipboardLink, setHasClipboardLink] = useState(false);

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?]*)/);
        setHasClipboardLink(!!match);
      } catch (error) {
        setHasClipboardLink(false);
      }
    };

    checkClipboard();
    window.addEventListener('focus', checkClipboard);
    return () => window.removeEventListener('focus', checkClipboard);
  }, []);

  const handleAddVideo = async () => {
    let urlToProcess = inputValue;

    if (!urlToProcess.trim() && hasClipboardLink) {
      try {
        urlToProcess = await navigator.clipboard.readText();
      } catch (error) {
        return triggerAlert('error', 'Clipboard Error', 'Could not read from clipboard. Please paste manually.');
      }
    }

    if (!urlToProcess.trim()) return;
    
    const match = urlToProcess.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?]*)/);
    const vidId = match ? match[1] : null;

    if (!vidId) return triggerAlert('error', 'Invalid URL.', 'Enter an actual YouTube video URL.');
    
    // Check for duplicates using id
    if (stagedVideos.some(v => v.id === vidId)) return triggerAlert('warning', 'Duplicate URL.', 'This video link is already staged.');

    try {
      const cleanUrl = `https://www.youtube.com/watch?v=${vidId}`;
      const res = await fetch(`https://www.youtube.com/oembed?url=${cleanUrl}&format=json`);

      if (!res.ok) {
        if (res.status === 404) {
          return triggerAlert('error', 'Video Not Found.', 'This video has been deleted or the URL is incorrect.');
        } else if (res.status === 401) {
          return triggerAlert('error', 'Video Restricted.', 'This video is set to private or the creator disabled embedding.');
        } else {
          return triggerAlert('error', 'Video Unavailable.', 'This video could not be verified by YouTube at this time.');
        }
      }

      const data = await res.json();
      
      // FIX: Supply BOTH id and videoId to satisfy types.ts completely!
      setStagedVideos([...stagedVideos, { id: vidId, videoId: vidId, url: urlToProcess, title: data.title }]);
      setInputValue('');

    } catch (error) {
      return triggerAlert('error', 'Verification Failed.', 'Could not reach YouTube to verify the video status.');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 animate-in fade-in duration-300">
      <div className="flex gap-4 mb-6">
        <div className="flex-grow relative flex items-center">
          <Link2 className="absolute left-5 w-5 h-5 text-gray-400" />
          <input 
            type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()} 
            placeholder="Paste a YouTube Video URL here..." 
            className="outline-none active:outline-none -[webkit-tap-highlight-color:transparent] w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 text-[15px] font-medium rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:bg-white focus:shadow-md focus:ring-2 focus:ring-brand-green transition-all duration-300"
          />
        </div>
        <button onClick={handleAddVideo} className="bg-brand-dark hover:bg-black text-white px-8 py-4 rounded-2xl font-bold text-[15px] flex items-center gap-2">
          {(!inputValue && hasClipboardLink) ? <ClipboardPaste className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {(!inputValue && hasClipboardLink) ? 'Paste & Add' : 'Add'}
        </button>
      </div>

      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className={`min-h-[250px] max-h-[320px] overflow-y-auto pr-2 flex flex-col ${stagedVideos.length === 0 ? 'justify-center' : 'justify-start pt-2'}`}>
          {stagedVideos.length === 0 ? (
            <div className="text-center">
              <Film className="w-10 h-10 text-gray-400 mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-gray-900 font-bold text-[15px] mb-1">No videos entries staged</h3>
              <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto">Staging empty. Paste YouTube links above to add videos manually.</p>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-1 gap-3">
              {stagedVideos.map((video) => (
                <StagedVideoItem 
                  key={video.id} 
                  video={video} 
                  onRemove={() => setStagedVideos(stagedVideos.filter(v => v.id !== video.id))} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${stagedVideos.length >= 2 ? 'bg-brand-green' : 'bg-gray-300'}`}></div>
          <span className="text-gray-900 font-bold text-[15px]">{stagedVideos.length} videos staged</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setStagedVideos([])} disabled={stagedVideos.length === 0} className="flex items-center gap-2 text-[#C22929] hover:bg-red-50 px-4 py-2 rounded-xl font-bold text-[14px] disabled:opacity-50"><Trash2 className="w-4 h-4" /> Clear List</button>
          <button onClick={onAnalyze} disabled={stagedVideos.length < 2} className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-[15px] transition-all duration-300 ${stagedVideos.length >= 2 ? 'bg-[#65CC28] text-white hover:scale-105 hover:shadow-lg' : 'bg-[#E5E7EB] text-gray-400'}`}>Analyze <Search className="w-4 h-4" strokeWidth={3} /></button>
        </div>
      </div>
    </div>
  );
}
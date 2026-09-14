import { useState, useEffect } from 'react';
import { getYouTubeThumbnail } from '../../data/utils';// Adjust path as needed

// Defining the props interface for strict TypeScript checking
interface VideoListItemProps {
  video: any;
  idx: number;
}

export default function VideoListItem({ video, idx }: VideoListItemProps) {
  // Initialize state with the existing title, or a generic fallback
  const [title, setTitle] = useState(video.title || `Analyzed Video ${idx + 1}`);

  useEffect(() => {
    // Only fetch if we are dealing with a generic or missing title and have a valid URL
    if (video.title && !video.title.startsWith("Analyzed Video")) return;
    if (!video.url.includes("youtube.com") && !video.url.includes("youtu.be")) return;

    const fetchTitle = async () => {
      try {
        // The magical, no-auth YouTube oEmbed endpoint
        const res = await fetch(`https://www.youtube.com/oembed?url=${video.url}&format=json`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title);
        }
      } catch (error) {
        console.error("Failed to fetch YouTube title", error);
        // Silently fallback to whatever we initialized with if the fetch fails
      }
    };

    fetchTitle();
  }, [video.url, video.title]);

  return (
    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
      <img 
        src={getYouTubeThumbnail(video.url) || `https://picsum.photos/seed/${video.id || idx}/120/68`} 
        alt="thumbnail" 
        className="w-12 h-12 rounded-lg object-cover bg-gray-200 shrink-0"
      />
      <div className="flex flex-col overflow-hidden">
        {/* We use our local state 'title' here so it updates dynamically */}
        <span className="text-[13px] font-bold text-gray-800 truncate" title={title}>{title}</span>
        <span className="text-[11px] text-gray-400 truncate">{video.url || 'youtube.com/watch'}</span>
      </div>
    </div>
  );
}
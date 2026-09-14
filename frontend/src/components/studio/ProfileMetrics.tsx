import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Commenter } from '../../types';

// Map the definitions directly to the exact labels used in the cards
const METRIC_DEFINITIONS: Record<string, string> = {
  "Comment Frequency": "The total number of comments posted by a unique commenter across the selected YouTube videos in the dataset.",
  "Burst (10 min)": "The maximum number of comments posted by a commenter within a ten-minute window.",
  "Repetition": "The degree of similarity among a commenter's posted comments, measured using Term Frequency-Inverse Document Frequency and cosine similarity.",
  "Reply Count": "The total number of replies posted by a unique commenter.",
  "Degree Centrality": "The number of direct connections a commenter has with other commenters in the co-commenter graph.",
  "Clustering coeff.": "A numeric value that measures how strongly nodes in a network tend to form triangles."
};

function MetricCard({ label, value, definition }: { label: string, value: string | number, definition: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[13px] text-gray-500 font-bold mb-1 uppercase tracking-wide">{label}</p>
          <p className="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold text-[#0B3B8C] tabular-nums">{value}</p>
        </div>
        {/* The icon now physically rotates 180 degrees when clicked */}
        <button className="text-gray-400 mt-1 hover:text-gray-600">
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Smooth Expandable Definition Section using the CSS Grid 1fr trick */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* overflow-hidden prevents the text from spilling out while the height is shrinking */}
        <div className="overflow-hidden">
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
              {definition}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileMetrics({ commenter }: { commenter: any }) {
  // ─── SAFETY NET: Prevents fatal crash if commenter is null ───
  if (!commenter || !commenter.metrics) {
    return <div className="p-10 text-center text-gray-400 font-bold">Select a commenter to view metrics.</div>;
  }

  const m = commenter.metrics;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <h3 className="mb-4 font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-gray-900">
        Activity Matrix (Behavioral)
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
        <MetricCard 
          label="Comment Frequency" 
          value={m.commentFrequency || 0} 
          definition={METRIC_DEFINITIONS["Comment Frequency"]} 
        />
        <MetricCard 
          label="Temporal Activity Burst (10 min)" 
          value={m.temporalBurst || 0} 
          definition={METRIC_DEFINITIONS["Burst (10 min)"]} 
        />
        <MetricCard 
          label="Content Repetition" 
          value={Number(m.contentRepetition || 0).toFixed(2)} 
          definition={METRIC_DEFINITIONS["Repetition"]} 
        />
        <MetricCard 
          label="Reply Count per Commenter" 
          value={m.replyCount || 0} 
          definition={METRIC_DEFINITIONS["Reply Count"]} 
        />
      </div>

      <h3 className="mb-4 font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-gray-900">
        Structural metrics (Network)
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard 
          label="Degree Centrality" 
          value={Number(m.degreeCentrality || 0).toFixed(2)} 
          definition={METRIC_DEFINITIONS["Degree Centrality"]} 
        />
        <MetricCard 
          label="Clustering coefficient" 
          value={Number(m.clusteringCoeff || 0).toFixed(2)} 
          definition={METRIC_DEFINITIONS["Clustering coeff."]} 
        />
      </div>
    </div>
  );
}
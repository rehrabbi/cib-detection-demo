import { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const FEATURE_LABELS: Record<string, string> = {
  temporalBurst: 'Temporal Burst',
  contentRepetition: 'Content Repetition',
  replyCount: 'Reply count',
  commentFrequency: 'Comment Frequency',
  degreeCentrality: 'Degree Centrality',
  clusteringCoeff: 'Clustering coefficient',
};

function LabelBadge({ label }: { label: string }) {
  const anomalous = label === 'Anomalous';
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${anomalous ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
      {label}
    </span>
  );
}

export default function CommenterList({ result, selected, onSelect }: { result: any, selected: any, onSelect: (c: any) => void }) {
  const [filter, setFilter] = useState('All');
  
  const [sortConfig, setSortConfig] = useState<{ key: 'riskScore' | 'topFeature', direction: 'asc' | 'desc' }>({ 
    key: 'riskScore', 
    direction: 'desc' 
  });

  const handleSort = (key: 'riskScore' | 'topFeature') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const rows = useMemo(() => {
    const filtered = result.commenters.filter((c: any) => filter === 'All' ? true : c.label === filter);
    
    return filtered.sort((a: any, b: any) => {

      if (sortConfig.key === 'riskScore') {
        return sortConfig.direction === 'asc' ? a.riskScore - b.riskScore : b.riskScore - a.riskScore;
      } 
      
      if (sortConfig.key === 'topFeature') {
        const featureA = FEATURE_LABELS[a.topFeature] || a.topFeature;
        const featureB = FEATURE_LABELS[b.topFeature] || b.topFeature;
        return sortConfig.direction === 'asc' 
          ? featureA.localeCompare(featureB) 
          : featureB.localeCompare(featureA);
      }
      
      return 0;
    });
  }, [result, filter, sortConfig]); 

  useEffect(() => {
    if (selected?.hashId) {
      const rowElement = document.getElementById(`commenter-row-${selected.hashId}`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selected?.hashId]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortConfig.key !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0B3B8C]" /> : <ChevronDown className="w-3 h-3 text-[#0B3B8C]" />;
  };

  return (
    <div className="bg-white border-r border-gray-200 flex flex-col shrink-0 h-full w-[550px]">
      <div className="p-6 pb-4">
        <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-gray-900 mb-5 text-center">Commenter's List</h2>
        <div className="flex bg-[#F3F4F6] rounded-full p-1 max-w-sm mx-auto">
          {['All', 'Anomalous', 'Organic'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-1 rounded-full py-2 text-[13px] font-bold transition-all ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-[1.2fr_0.6fr_0.9fr_1.3fr] px-6 py-3 border-y border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
        <span>Hash ID</span>
        <button onClick={() => handleSort('riskScore')} className="flex items-center gap-1 hover:text-gray-700 transition-colors uppercase text-left">
          Risk <SortIcon field="riskScore" />
        </button>
        <span>Label</span>
        <button onClick={() => handleSort('topFeature')} className="flex items-center gap-1 hover:text-gray-700 transition-colors uppercase text-left">
          Top Feature <SortIcon field="topFeature" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {rows.map((c: any) => {
          const active = c.hashId === selected?.hashId;
          return (
            <button
              key={c.hashId}
              id={`commenter-row-${c.hashId}`} 
              onClick={() => onSelect(c)}
              className={`w-full grid grid-cols-[1.2fr_0.6fr_0.9fr_1.3fr] items-center px-6 py-4 text-left text-[13px] border-b border-gray-50 transition-colors ${active ? 'bg-[#0B3B8C]/10 shadow-inner' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono text-gray-600 font-medium truncate pr-4">{c.hashId}</span>
              <span className={`font-bold ${c.label === 'Anomalous' ? 'text-red-600' : 'text-gray-500'}`}>{c.riskScore.toFixed(2)}</span>
              <span><LabelBadge label={c.label} /></span>
              <span className="text-gray-500 font-medium truncate pr-2">{FEATURE_LABELS[c.topFeature] || c.topFeature}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
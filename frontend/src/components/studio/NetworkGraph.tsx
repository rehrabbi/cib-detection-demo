import { useEffect, useState, useMemo } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import { Plus, Minus, AlertTriangle } from 'lucide-react'

// --- VISUAL STYLING: Thicker edges, unclickable nodes dimmed ---
const stylesheet: any[] = [
  {
    selector: 'node',
    style: {
      width: 'mapData(risk, 0, 1, 15, 35)',
      height: 'mapData(risk, 0, 1, 15, 35)',
      'background-color': '#84CC16',
      'border-width': 2,
      'border-color': '#ffffff',
    },
  },
  {
    selector: 'node[kind = "anomalous"], node[label = "Anomalous"]', 
    style: {
      'background-color': '#DC2626', 
    },
  },
  {
    selector: 'node.unclickable',
    style: {
      opacity: 0.4, 
      'border-width': 0,
      width: 12,  
      height: 12,
    }
  },
  {
    selector: 'edge',
    style: {
      width: 2, 
      'line-color': '#6B7280', 
      'curve-style': 'haystack',
      opacity: 0.35,
    },
  },
  {
    selector: 'node.active',
    style: {
      'border-width': 4,
      'border-color': '#0B3B8C',
      opacity: 1, 
    },
  },
]

const buildSafeGraphElements = (result: any) => {
  // --- HANS' PERFORMANCE CAP (Stops the lag on 3+ videos!) ---
  const fullList = result.allCommenters || result.commenters;
  if (!fullList) return [];

  const MAX_CONTEXT_NODES = 80;
  const top100Set = new Set((result.commenters || []).map((c: any) => c.hashId));
  const rest = fullList.filter((c: any) => !top100Set.has(c.hashId));
  
  const sourceList = [...(result.commenters || []), ...rest.slice(0, MAX_CONTEXT_NODES)];

  const nodes = sourceList.map((c: any) => ({
    data: { id: c.hashId, label: c.label, risk: c.riskScore, kind: c.label.toLowerCase() },
    classes: top100Set.has(c.hashId) ? 'clickable' : 'unclickable' 
  }));

  const edges = [];
  
  // --- THE ORIGINAL WEB LOGIC ---
  // This creates the natural, organic connections so the physics engine can 
  // push and pull them into that beautiful "hairball" shape you like.
  for (let i = 1; i < nodes.length; i++) {
    const targetIndex = Math.random() > 0.3 
      ? Math.floor(Math.random() * Math.min(10, i)) 
      : Math.floor(Math.random() * i);
      
    edges.push({
      data: { source: nodes[i].data.id, target: nodes[targetIndex].data.id }
    });
  }
  
  return [...nodes, ...edges];
};

interface NetworkGraphProps {
  result: any;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onInit?: (cy: any) => void;
}

export default function NetworkGraph({ result, selectedId, onSelect, onInit }: NetworkGraphProps) {
  const [cy, setCy] = useState<any>(null);
  const elements = useMemo(() => buildSafeGraphElements(result), [result]);

  const meanClustering = useMemo(() => {
    if (!result?.commenters?.length) return 0;
    const total = result.commenters.reduce((sum: number, c: any) => sum + (c.metrics?.clusteringCoeff || 0), 0);
    return total / result.commenters.length;
  }, [result]);

  const isHighDensity = meanClustering >= 0.5;

  useEffect(() => {
    if (cy && selectedId) {
      cy.elements().removeClass('active');
      const node = cy.getElementById(selectedId);
      if (node.length > 0) node.addClass('active');
    }
  }, [cy, selectedId]);

  useEffect(() => {
    if (!cy) return;
    
    cy.removeAllListeners('tap');
    cy.removeAllListeners('mouseover');
    cy.removeAllListeners('mouseout');

    cy.on('tap', 'node.clickable', (evt: any) => {
      if (onSelect) onSelect(evt.target.id());
    });

    cy.on('mouseover', 'node.clickable', () => {
      const container = cy.container();
      if (container) container.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node.clickable', () => {
      const container = cy.container();
      if (container) container.style.cursor = 'default';
    });
  }, [cy, onSelect]);

  const handleZoomIn = () => { if (cy) cy.zoom(cy.zoom() + 0.2); };
  const handleZoomOut = () => { if (cy) cy.zoom(cy.zoom() - 0.2); };

  if (!elements.length) return <div className="p-10 text-center text-gray-500">Loading graph...</div>;

  return (
    <div className="animate-in fade-in duration-300 h-full w-full">
      <div className="relative h-[560px] overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm group">
        <CytoscapeComponent
          cy={(cyInstance) => { 
            setCy(cyInstance); 
            if (onInit) onInit(cyInstance); 
          }}
          elements={elements}
          stylesheet={stylesheet}
          style={{ width: '100%', height: '100%' }}
          
          // --- THE PHYSICS ENGINE ('cose') ---
          // This calculates the gravity and repulsion to give you that organic look.
          layout={{ 
            name: 'cose', 
            animate: false, // Keep this false so your export doesn't freeze
            padding: 30,
            nodeRepulsion: 4000, // Pushes nodes apart so they don't clump
            idealEdgeLength: 50,
            randomize: true
          }}
          minZoom={0.2} maxZoom={2.5} wheelSensitivity={0.2}
          autounselectify={true}
          autoungrabify={true} 
          boxSelectionEnabled={false}
        />
        
        <div className="absolute left-4 top-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 text-xs backdrop-blur font-bold shadow-sm z-10">
          <span className="flex items-center gap-2 text-gray-600"><span className="h-3 w-3 rounded-full bg-[#84CC16]" /> Organic</span>
          <span className="flex items-center gap-2 text-gray-600"><span className="h-3 w-3 rounded-full bg-[#DC2626]" /> Anomalous</span> 
          
          <div className={`mt-1 flex items-center gap-1.5 border-t border-gray-200 pt-2 ${isHighDensity ? 'text-[#DC2626]' : 'text-[#0B3B8C]'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> 
            {isHighDensity ? 'High Density Network' : 'Low Density Network'}
          </div>
        </div>

        <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={handleZoomIn} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"><Plus className="w-4 h-4" /></button>
          <button onClick={handleZoomOut} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"><Minus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
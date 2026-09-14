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

// Render budget. On a two-video job the co-commenter graph is a clique among
// commenters present on both videos, so edges grow quadratically with overlap.
// These caps keep the renderer responsive; truncation is shown in the legend
// rather than hidden.
const MAX_CONNECTED_NODES = 500;
const MAX_ISOLATED_CONTEXT = 60;
const MAX_EDGES = 25000;

const buildGraph = (result: any) => {
  const raw = result?.networkGraph?.elements;
  if (!Array.isArray(raw) || raw.length === 0) return { elements: [], stats: null };

  const rawNodes = raw.filter((e: any) => e?.data && e.data.source === undefined);
  const rawEdges = raw.filter((e: any) => e?.data && e.data.source !== undefined);

  const degree = new Map<string, number>();
  for (const e of rawEdges) {
    degree.set(e.data.source, (degree.get(e.data.source) || 0) + 1);
    degree.set(e.data.target, (degree.get(e.data.target) || 0) + 1);
  }

  // Commenters below the edge threshold have no edges at all. Showing every one
  // of them drowns the structure, so connected nodes come first and isolated
  // nodes appear only as bounded context.
  const connected = rawNodes.filter((n: any) => degree.has(n.data.id));
  const isolated = rawNodes.filter((n: any) => !degree.has(n.data.id));
  connected.sort((a: any, b: any) => (degree.get(b.data.id) || 0) - (degree.get(a.data.id) || 0));

  const riskById = new Map<string, number>();
  for (const c of (result.allCommenters || result.commenters || [])) {
    riskById.set(c.hashId, c.riskScore ?? 0);
  }
  const clickable = new Set((result.commenters || []).map((c: any) => c.hashId));

  const keptNodes = [
    ...connected.slice(0, MAX_CONNECTED_NODES),
    ...isolated.slice(0, MAX_ISOLATED_CONTEXT),
  ];
  const keptIds = new Set(keptNodes.map((n: any) => n.data.id));

  let keptEdges = rawEdges.filter(
    (e: any) => keptIds.has(e.data.source) && keptIds.has(e.data.target)
  );
  const edgesTruncated = keptEdges.length > MAX_EDGES;
  if (edgesTruncated) keptEdges = keptEdges.slice(0, MAX_EDGES);

  const nodes = keptNodes.map((n: any) => ({
    data: {
      id: n.data.id,
      label: n.data.classification ?? n.data.label,
      risk: riskById.get(n.data.id) ?? 0,
      kind: String(n.data.classification ?? '').toLowerCase(),
      degree: degree.get(n.data.id) || 0,
    },
    classes: clickable.has(n.data.id) ? 'clickable' : 'unclickable',
  }));

  const edges = keptEdges.map((e: any, i: number) => ({
    data: { id: e.data.id ?? `e${i}`, source: e.data.source, target: e.data.target },
  }));

  // The server bounds what it stores, so counting the payload would report the
  // size of the excerpt rather than of the graph. Prefer its stats when present.
  const server = result?.networkGraph?.stats;

  return {
    elements: [...nodes, ...edges],
    stats: {
      totalNodes: server?.total_nodes ?? rawNodes.length,
      totalEdges: server?.total_edges ?? rawEdges.length,
      connected: server?.connected_nodes ?? connected.length,
      isolated: server?.isolated_nodes ?? isolated.length,
      shownNodes: nodes.length,
      shownEdges: edges.length,
      truncated:
        Boolean(server?.truncated) ||
        edgesTruncated ||
        connected.length > MAX_CONNECTED_NODES,
    },
  };
};

interface NetworkGraphProps {
  result: any;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onInit?: (cy: any) => void;
}

export default function NetworkGraph({ result, selectedId, onSelect, onInit }: NetworkGraphProps) {
  const [cy, setCy] = useState<any>(null);
  const { elements, stats } = useMemo(() => buildGraph(result), [result]);

  // A clique of n nodes carries n(n-1)/2 edges, which at the default opacity
  // paints a solid disc and hides the nodes. Thin and fade edges as density
  // rises so the mesh stays readable.
  const densityStylesheet = useMemo(() => {
    const edgeCount = stats?.shownEdges ?? 0;
    if (edgeCount <= 1500) return stylesheet;
    const opacity = edgeCount > 15000 ? 0.04 : edgeCount > 6000 ? 0.08 : 0.15;
    const width = edgeCount > 6000 ? 0.5 : 1;
    return stylesheet.map((rule: any) =>
      rule.selector === 'edge'
        ? { ...rule, style: { ...rule.style, opacity, width } }
        : rule
    );
  }, [stats]);

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

  if (!elements.length) return <div className="p-10 text-center text-gray-500">No co-commenter edges to display. A commenter must appear on both videos to form an edge.</div>;

  return (
    <div className="animate-in fade-in duration-300 h-full w-full">
      <div className="relative h-[560px] overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm group">
        <CytoscapeComponent
          cy={(cyInstance) => { 
            setCy(cyInstance); 
            if (onInit) onInit(cyInstance); 
          }}
          elements={elements}
          stylesheet={densityStylesheet}
          style={{ width: '100%', height: '100%' }}
          
          // --- THE PHYSICS ENGINE ('cose') ---
          // This calculates the gravity and repulsion to give you that organic look.
          // Force layout cannot settle a dense clique, so anything large falls
          // back to a deterministic concentric ring keyed on degree.
          layout={
            elements.length > 3000
              ? { name: 'concentric', animate: false, padding: 30,
                  concentric: (n: any) => n.data('degree') || 0,
                  levelWidth: () => 1, minNodeSpacing: 8 }
              : { name: 'cose', animate: false, padding: 30,
                  nodeRepulsion: 4000, idealEdgeLength: 50, randomize: true }
          }
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

          {stats && (
            <div className="mt-1 border-t border-gray-200 pt-2 font-normal text-[11px] leading-relaxed text-gray-500">
              <div>{stats.connected.toLocaleString()} connected / {stats.isolated.toLocaleString()} isolated</div>
              <div>{stats.totalEdges.toLocaleString()} edges</div>
              {stats.truncated && (
                <div className="text-[#B45309]">
                  showing {stats.shownNodes.toLocaleString()} nodes, {stats.shownEdges.toLocaleString()} edges
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={handleZoomIn} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"><Plus className="w-4 h-4" /></button>
          <button onClick={handleZoomOut} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"><Minus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
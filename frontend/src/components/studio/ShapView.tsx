import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Commenter, JobResult } from '../../types' 

// ─── LOCAL SAFETY FALLBACKS ───
const SAFE_LABELS: Record<string, string> = {
  temporalBurst: 'Temporal Burst',
  contentRepetition: 'Content Repetition',
  replyCount: 'Reply count',
  commentFrequency: 'Comment Frequency',
  degreeCentrality: 'Degree Centrality',
  clusteringCoeff: 'Clustering coefficient',
};
const SAFE_BEHAVIORAL = ['commentFrequency', 'temporalBurst', 'contentRepetition', 'replyCount'];

interface Row { label: string; value: number; pct: string; behavioral: boolean; }

function toRows(shap: Record<string, number>): Row[] {
  if (!shap) return [];
  return Object.keys(shap)
    .map((k) => ({
      label: SAFE_LABELS[k] || k,
      value: shap[k],
      pct: `${Math.round(shap[k] * 100)}%`,
      behavioral: SAFE_BEHAVIORAL.includes(k),
    }))
    .sort((a, b) => b.value - a.value)
}

function ShapChart({ title, rows }: { title: string, rows: Row[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.value)) * 1.15;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
      <h4 className="mb-5 text-center font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-gray-900">{title}</h4>
      <ResponsiveContainer width="100%" height={rows.length * 40 + 10}>
        <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="label" width={180} tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 600 }} />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.behavioral ? '#0B3B8C' : '#65CC28'} />
            ))}
            <LabelList dataKey="pct" position="right" style={{ fontSize: 13, fontWeight: 700, fill: '#111827' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ShapView({ commenter, result }: { commenter: any, result: any }) {
  // SAFETY NET
  if (!commenter || !commenter.shapLocal || !result || !result.shapGlobal) {
    return <div className="p-10 text-center text-gray-400 font-bold">Select a commenter to view XAI attribution.</div>;
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <ShapChart title="Localized SHAP Attribution" rows={toRows(commenter.shapLocal)} />
      <ShapChart title="Top 100 Mean Absolute Shap Value" rows={toRows(result.shapGlobal)} />
    </div>
  )
}
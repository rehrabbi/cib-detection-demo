// ---------------------------------------------------------------------------
// Deterministic mock data for the standalone prototype.
// Replace generateResult() with a real fetch to the FastAPI /results endpoint
// once the backend is live. Shapes match src/types.ts exactly.
// ---------------------------------------------------------------------------

import type {
  Commenter,
  FeatureKey,
  JobResult,
  Label,
  StagedVideo
} from '../types'

import {
  BEHAVIORAL_FEATURES,
  NETWORK_FEATURES,
} from '../types'

// Small seeded PRNG (mulberry32) so the same job looks the same on reload.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEX = '0123456789abcdef'
function fakeHash(rand: () => number): string {
  let s = ''
  for (let i = 0; i < 10; i++) s += HEX[Math.floor(rand() * 16)]
  return s + '.'
}

const ALL_FEATURES: FeatureKey[] = [...BEHAVIORAL_FEATURES, ...NETWORK_FEATURES]

function normalizeShares(raw: Record<FeatureKey, number>): Record<FeatureKey, number> {
  const total = ALL_FEATURES.reduce((s, f) => s + raw[f], 0) || 1
  const out = {} as Record<FeatureKey, number>
  ALL_FEATURES.forEach((f) => (out[f] = raw[f] / total))
  return out
}

function makeCommenter(rand: () => number, anomalous: boolean): Commenter {
  // Anomalous commenters: high burst, high repetition, dense clustering.
  const metrics = anomalous
    ? {
        commentFrequency: Math.round(120 + rand() * 160),
        temporalBurst: Math.round(14 + rand() * 22),
        contentRepetition: +(0.7 + rand() * 0.28).toFixed(2),
        replyCount: Math.round(25 + rand() * 45),
        degreeCentrality: +(0.45 + rand() * 0.45).toFixed(2),
        clusteringCoeff: +(0.6 + rand() * 0.35).toFixed(2),
      }
    : {
        commentFrequency: Math.round(1 + rand() * 22),
        temporalBurst: Math.round(rand() * 3),
        contentRepetition: +(rand() * 0.35).toFixed(2),
        replyCount: Math.round(rand() * 6),
        degreeCentrality: +(rand() * 0.18).toFixed(2),
        clusteringCoeff: +(rand() * 0.25).toFixed(2),
      }

  // Local SHAP contribution shares (which features pushed the score).
  const rawShap: Record<FeatureKey, number> = anomalous
    ? {
        temporalBurst: 0.30 + rand() * 0.1,
        clusteringCoeff: 0.22 + rand() * 0.08,
        replyCount: 0.16 + rand() * 0.05,
        commentFrequency: 0.1 + rand() * 0.05,
        degreeCentrality: 0.07 + rand() * 0.04,
        contentRepetition: 0.03 + rand() * 0.05,
      }
    : {
        replyCount: 0.26 + rand() * 0.08,
        commentFrequency: 0.22 + rand() * 0.06,
        contentRepetition: 0.18 + rand() * 0.05,
        degreeCentrality: 0.14 + rand() * 0.05,
        temporalBurst: 0.1 + rand() * 0.04,
        clusteringCoeff: 0.06 + rand() * 0.03,
      }
  const shapLocal = normalizeShares(rawShap)

  // Top contributing feature.
  const topFeature = ALL_FEATURES.reduce((a, b) =>
    shapLocal[a] >= shapLocal[b] ? a : b
  )

  const riskScore = anomalous
    ? +(0.72 + rand() * 0.26).toFixed(2)
    : +(0.06 + rand() * 0.34).toFixed(2)

  const label: Label = anomalous ? 'Anomalous' : 'Organic'

  return {
    hashId: fakeHash(rand),
    riskScore,
    label,
    topFeature,
    metrics,
    shapLocal,
    cluster: anomalous ? 1 + Math.floor(rand() * 2) : 0,
  }
}

const VIDEO_TITLES = [
  'Philippine Election Campaign 2022',
  'Halalan 2022: Presidential Debate Highlights',
  'Eleksyon 2025 — Senatorial Forum',
  'GMA News: Midterm Election Coverage',
  'Rappler: Fact Check Special',
]

export function buildVideos(staged: StagedVideo[]): StagedVideo[] {
  if (staged.length) return staged
  // Fallback demo videos if the user lands on /studio directly.
  return VIDEO_TITLES.map((title, i) => ({
    id: `demo-${i}`,
    url: 'https://www.youtube.com/watch?v=demo' + i,
    videoId: 'demo' + i,
    title,
  }))
}

export function generateResult(
  videos: StagedVideo[],
  contamination: number,
  seed = 42
): JobResult {
  const rand = mulberry32(seed)
  const total = 1200
  const anomalyRate = contamination * (0.85 + rand() * 0.3) // near the contamination assumption
  const anomalousCount = Math.max(2, Math.round(total * anomalyRate))

  // We render the "top 100" commenters in the table for performance parity.
  const SHOWN = 100
  const shownAnomalous = Math.min(SHOWN, Math.round(SHOWN * anomalyRate) + 6)

  const commenters: Commenter[] = []
  for (let i = 0; i < SHOWN; i++) {
    commenters.push(makeCommenter(rand, i < shownAnomalous))
  }
  // Sort by risk descending so anomalous float to the top of the list.
  commenters.sort((a, b) => b.riskScore - a.riskScore)

  // Global SHAP = mean local shares across the shown set.
  const acc = {} as Record<FeatureKey, number>
  ALL_FEATURES.forEach((f) => (acc[f] = 0))
  commenters.forEach((c) => ALL_FEATURES.forEach((f) => (acc[f] += c.shapLocal[f])))
  ALL_FEATURES.forEach((f) => (acc[f] /= commenters.length))
  const shapGlobal = normalizeShares(acc)

  const now = new Date()
  return {
    jobId: 'a3f7cb84',
    dateProcessed: now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    timeProcessed: now.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    contamination,
    totalCommenters: total,
    anomalyRate,
    commenters,
    shapGlobal,
    videos: buildVideos(videos),
  }
}

// --- Co-commenter graph for the Network Graph tab ---------------------------
// Builds a Cytoscape-ready element list: a dense anomalous cluster + sparse
// organic periphery, matching how the thesis describes coordinated structure.
export function buildGraphElements(result: JobResult) {
  const rand = mulberry32(7)
  const nodes: any[] = []
  const edges: any[] = []

  const sample = result.commenters.slice(0, 60)
  sample.forEach((c, i) => {
    nodes.push({
      data: {
        id: 'n' + i,
        label: c.hashId,
        risk: c.riskScore,
        kind: c.label === 'Anomalous' ? 'anomalous' : 'organic',
      },
    })
  })

  const anomalous = sample
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.label === 'Anomalous')
  const organic = sample
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.label === 'Organic')

  // Dense clique among anomalous nodes (high clustering coefficient).
  for (let a = 0; a < anomalous.length; a++) {
    for (let b = a + 1; b < anomalous.length; b++) {
      if (rand() < 0.55) {
        edges.push({
          data: {
            id: `e${anomalous[a].i}-${anomalous[b].i}`,
            source: 'n' + anomalous[a].i,
            target: 'n' + anomalous[b].i,
            coordinated: true,
          },
        })
      }
    }
  }
  // Sparse, mostly non-repeating organic links.
  organic.forEach((o) => {
    const links = Math.floor(rand() * 2)
    for (let k = 0; k < links; k++) {
      const target = organic[Math.floor(rand() * organic.length)]
      if (target.i !== o.i) {
        edges.push({
          data: {
            id: `eo${o.i}-${target.i}-${k}`,
            source: 'n' + o.i,
            target: 'n' + target.i,
            coordinated: false,
          },
        })
      }
    }
  })

  return [...nodes, ...edges]
}

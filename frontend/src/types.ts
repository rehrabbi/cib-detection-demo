// ---------------------------------------------------------------------------
// CIBWatch domain types
// These mirror what the FastAPI backend will eventually return, so swapping the
// mock layer for real API calls is a matter of matching these shapes.
// ---------------------------------------------------------------------------

export type FeatureKey =
  | 'commentFrequency'
  | 'temporalBurst'
  | 'contentRepetition'
  | 'replyCount'
  | 'degreeCentrality'
  | 'clusteringCoeff'

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  commentFrequency: 'Comment Frequency',
  temporalBurst: 'Temporal Burst',
  contentRepetition: 'Content Repetition',
  replyCount: 'Reply Count per Commenter',
  degreeCentrality: 'Degree Centrality',
  clusteringCoeff: 'Clustering Coefficient',
}

export const BEHAVIORAL_FEATURES: FeatureKey[] = [
  'commentFrequency',
  'temporalBurst',
  'contentRepetition',
  'replyCount',
]

export const NETWORK_FEATURES: FeatureKey[] = ['degreeCentrality', 'clusteringCoeff']

export type Label = 'Anomalous' | 'Organic'

/** A staged YouTube video on the Analyze page. */
export interface StagedVideo {
  id: string // local row id
  url: string
  videoId: string | null
  title: string
}

/** One analyzed commenter (one row in the feature matrix). */
export interface Commenter {
  hashId: string // SHA-256 prefix shown in the UI
  riskScore: number // 0..1 CIB risk score
  label: Label
  topFeature: FeatureKey // strongest SHAP contributor
  // Raw feature values (Profile Metrics tab)
  metrics: {
    commentFrequency: number
    temporalBurst: number
    contentRepetition: number
    replyCount: number
    degreeCentrality: number
    clusteringCoeff: number
  }
  // Per-feature local SHAP contribution (share of |SHAP|, sums to ~1)
  shapLocal: Record<FeatureKey, number>
  cluster: number // graph cluster id (for the network view)
}

/** Result of a completed analysis job. */
export interface JobResult {
  jobId: string
  dateProcessed: string
  timeProcessed: string
  contamination: number
  totalCommenters: number
  anomalyRate: number // 0..1
  commenters: Commenter[]
  shapGlobal: Record<FeatureKey, number> // mean |SHAP| share across top 100
  videos: StagedVideo[]
}

/** Pipeline stages mirrored from the System Architecture (Chapter 3). */
export type StageId =
  | 'fetching'
  | 'preprocessing'
  | 'features'
  | 'anomaly'
  | 'shap'

export interface Stage {
  id: StageId
  label: string
  index: number // 1..5
}

export const STAGES: Stage[] = [
  { id: 'fetching', label: 'Fetching comments', index: 1 },
  { id: 'preprocessing', label: 'Preprocessing', index: 2 },
  { id: 'features', label: 'Feature Extraction', index: 3 },
  { id: 'anomaly', label: 'Anomaly Detection', index: 4 },
  { id: 'shap', label: 'SHAP Values', index: 5 },
]

export interface LogLine {
  t: string // HH:MM:SS elapsed
  text: string
  tone?: 'ok' | 'plain'
}

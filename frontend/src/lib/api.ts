// ---------------------------------------------------------------------------
// API integration point.
//
// These calls talk to the live FastAPI backend. The base URL comes from
// VITE_API_BASE_URL, which docker-compose supplies.
// ---------------------------------------------------------------------------

import type { JobResult } from '../types'

// Make sure BASE points to the /api prefix based on your FastAPI setup
const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// 1. Updated payload to match backend's JobSubmitRequest schema
export interface CreateJobBody {
  video_url_1: string
  video_url_2: string
  use_sample_data?: boolean
}

// 2. Added response interface matching the backend's output
export interface JobSubmitResponse {
  job_id: string
  status: string
}

// 3. Status structure matching the WebSocket/Status output
export interface JobStatusOut {
  id: string
  video_url_1: string
  video_url_2: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  message: string
  used_sample_data: boolean
}

/** Dispatch a detection job (backend enqueues the Celery worker). */
export async function createJob(body: CreateJobBody): Promise<JobSubmitResponse> {
  const res = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `createJob failed: ${res.status}`)
  }
  
  return res.json()
}

/** Subscribe to live pipeline progress over WebSocket. */
export function subscribeToProgress(
  jobId: string,
  onMessage: (data: JobStatusOut) => void
): () => void {
  // Swaps http:// with ws:// and targets the correct backend WS route
  const wsBase = BASE.replace(/^http/, 'ws')
  const ws = new WebSocket(`${wsBase}/ws/${jobId}`)
  
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch (err) {
      console.error('Failed to parse WS payload:', err)
    }
  }
  
  return () => ws.close()
}

/** Fetch the finished result. Shape must match src/types.ts JobResult. */
export async function fetchResult(jobId: string): Promise<JobResult> {
  const res = await fetch(`${BASE}/jobs/${jobId}/result`)
  if (!res.ok) throw new Error(`fetchResult failed: ${res.status}`)
  return res.json()
}

/** Ask the backend to stop a running job. Safe to call on a finished job. */
export async function cancelJob(jobId: string): Promise<JobStatusOut> {
  const res = await fetch(`${BASE}/jobs/${jobId}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to cancel job (${res.status})`)
  return res.json()
}

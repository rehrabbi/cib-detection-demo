import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import type { JobResult, StagedVideo } from '../types'
import { createJob, fetchResult } from './api'
import type { CreateJobBody } from './api'

interface JobState {
  staged: StagedVideo[]
  useSampleData: boolean | null
  currentJobId: string | null
  result: JobResult | null
  setStaged: (v: StagedVideo[]) => void
  setUseSampleData: (v: boolean | null) => void
  /** Submits the URLs to the FastAPI backend and stores the job ID. */
  startDetectionJob: () => Promise<string>
  /** Fetches the final result once the backend finishes processing. */
  loadResult: (jobId: string) => Promise<void>
  reset: () => void
}

const JobContext = createContext<JobState | null>(null)

export function JobProvider({ children }: { children: ReactNode }) {
  const [staged, setStaged] = useState<StagedVideo[]>([])
  // null means "let the server decide". The backend treats a null
  // use_sample_data as "use the USE_SAMPLE_DATA setting from .env", so the UI
  // must not send a value unless the user has actually chosen one. Sending a
  // hardcoded value here silently overrides the server's configuration.
  const [useSampleData, setUseSampleData] = useState<boolean | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [result, setResult] = useState<JobResult | null>(null)

  const startDetectionJob = useCallback(async () => {
    if (staged.length < 2) {
      throw new Error('Please stage at least 2 videos before starting.')
    }

    // Map the UI state to the backend schema. use_sample_data is omitted
    // unless explicitly set, so the server's .env setting governs by default.
    const body: CreateJobBody = {
      video_url_1: staged[0].url,
      video_url_2: staged[1].url,
    }
    if (useSampleData !== null) {
      body.use_sample_data = useSampleData
    }

    const res = await createJob(body)
    setCurrentJobId(res.job_id)
    return res.job_id
  }, [staged, useSampleData])

  const loadResult = useCallback(async (jobId: string) => {
    try {
      const r = await fetchResult(jobId)
      setResult(r)
    } catch (err) {
      console.error('Failed to load result:', err)
    }
  }, [])

  const reset = useCallback(() => {
    setStaged([])
    setUseSampleData(null)
    setCurrentJobId(null)
    setResult(null)
  }, [])

  const value = useMemo(
    () => ({
      staged,
      useSampleData,
      currentJobId,
      result,
      setStaged,
      setUseSampleData,
      startDetectionJob,
      loadResult,
      reset,
    }),
    [staged, useSampleData, currentJobId, result, startDetectionJob, loadResult, reset]
  )

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>
}

export function useJob() {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used within <JobProvider>')
  return ctx
}

// --- YouTube URL helpers ----------------------------------------------------
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
]

export function extractVideoId(url: string): string | null {
  const trimmed = url.trim()
  for (const re of YT_PATTERNS) {
    const m = trimmed.match(re)
    if (m) return m[1]
  }
  return null
}
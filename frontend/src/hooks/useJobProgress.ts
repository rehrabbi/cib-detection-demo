import { useState, useEffect } from 'react';

export interface JobProgressData {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export const useJobProgress = (jobId: string | null) => {
  const [jobData, setJobData] = useState<JobProgressData | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    // Do not attempt connection if no job is queued
    if (!jobId) return;

    // Use environment variable for the backend base URL (e.g., ws://localhost:8000)
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
    const ws = new WebSocket(`${baseUrl}/api/ws/${jobId}`);

    setIsActive(true);

    ws.onmessage = (event) => {
      try {
        const payload: JobProgressData = JSON.parse(event.data);
        setJobData(payload);

        // Optional: Expose an event when terminal state is reached
        if (payload.status === 'completed' || payload.status === 'failed') {
          setIsActive(false);
        }
      } catch (err) {
        console.error('Failed to parse incoming WS stream:', err);
      }
    };

    ws.onclose = (event) => {
      setIsActive(false);
      if (event.code !== 1000) {
        console.warn(`WebSocket closed unexpectedly with code: ${event.code}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      setIsActive(false);
    };

    // Strict cleanup: Close connection if the component unmounts or jobId changes
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [jobId]);

  return { jobData, isActive };
};
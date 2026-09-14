import { useState, useEffect } from 'react';

export interface JobProgressData {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | string;
  progress: number;
  message: string;
  error?: string;
}

const TERMINAL_STATES = ['completed', 'failed', 'cancelled'];

// A dropped websocket used to end progress updates permanently: onclose only
// logged a warning, nothing reconnected, and there was no other source of
// progress. The elapsed timer kept running, so a frozen page looked alive while
// the job carried on finishing in the background. The socket now reconnects with
// backoff, and a slow poll runs alongside it as a safety net for the case where
// the socket stays open but stops delivering.
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const POLL_INTERVAL_MS = 5000;

export const useJobProgress = (jobId: string | null) => {
  const [jobData, setJobData] = useState<JobProgressData | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    if (!jobId) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
    // docker-compose supplies VITE_WS_BASE_URL, already including /api/ws.
    const wsBase =
      import.meta.env.VITE_WS_BASE_URL ?? `${apiBase.replace(/^http/, 'ws')}/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;
    let attempts = 0;
    let stopped = false;

    const stopAll = () => {
      stopped = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'Component unmounted');
      }
    };

    const handlePayload = (payload: JobProgressData) => {
      if (stopped) return;
      setJobData(payload);
      if (TERMINAL_STATES.includes(payload.status)) {
        setIsActive(false);
        stopAll();
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${apiBase}/jobs/${jobId}`);
        if (res.ok) handlePayload(await res.json());
      } catch {
        // The socket or the next poll will recover; a transient failure here
        // must not surface as an error on a page that is otherwise fine.
      }
    };

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(`${wsBase}/${jobId}`);

      ws.onopen = () => {
        attempts = 0;
        setIsActive(true);
      };

      ws.onmessage = (event) => {
        try {
          handlePayload(JSON.parse(event.data) as JobProgressData);
        } catch (err) {
          console.error('Failed to parse incoming WS stream:', err);
        }
      };

      ws.onclose = (event) => {
        setIsActive(false);
        if (stopped || event.code === 1000) return;
        attempts += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** (attempts - 1), RECONNECT_MAX_MS);
        console.warn(
          `WebSocket closed with code ${event.code}; reconnecting in ${delay}ms.`
        );
        reconnectTimer = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose always follows, which is where reconnection is scheduled.
      };
    };

    connect();
    poll();
    pollTimer = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => stopAll();
  }, [jobId]);

  return { jobData, isActive };
};

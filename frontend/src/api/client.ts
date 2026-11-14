const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface Health {
  status: string;
  service: string;
  version: string;
}

export interface AnalysisJob {
  id: number;
  name: string;
  kind: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText} - ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

export const getHealth = () => request<Health>("/api/health");

export const listJobs = () => request<AnalysisJob[]>("/api/jobs");

export const createJob = (body: {
  name: string;
  kind: string;
  payload: Record<string, unknown>;
}) =>
  request<AnalysisJob>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });

import type {
  HistoryEntry,
  HistoryListResponse,
  RunAndSaveRequest,
  RunAndSaveResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getApiUrl = (path: string) => {
  if (API_BASE_URL.includes("/api")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/api/v1${path}`;
};

export async function getBacktestHistory(
  options?: { skip?: number; limit?: number }
): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  if (options?.skip) params.append("skip", options.skip.toString());
  if (options?.limit) params.append("limit", options.limit.toString());

  const response = await fetch(
    getApiUrl(`/backtest/history${params.toString() ? `?${params}` : ""}`),
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch backtest history");
  }

  return response.json();
}

export async function getHistoryEntry(id: number): Promise<HistoryEntry> {
  const response = await fetch(getApiUrl(`/backtest/history/${id}`), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch history entry");
  }

  return response.json();
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  const response = await fetch(getApiUrl(`/backtest/history/${id}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete history entry");
  }
}

export async function runAndSaveBacktest(
  request: RunAndSaveRequest
): Promise<RunAndSaveResponse> {
  const response = await fetch(getApiUrl("/backtest/run-and-save"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Backtest failed");
  }

  return response.json();
}

import type {
  SavedPortfolio,
  PortfolioCreate,
  PortfolioUpdate,
  PortfolioListResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getApiUrl = (path: string) => {
  if (API_BASE_URL.includes("/api")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/api/v1${path}`;
};

export async function createPortfolio(
  data: PortfolioCreate
): Promise<SavedPortfolio> {
  const response = await fetch(getApiUrl("/portfolios"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create portfolio");
  }

  return response.json();
}

export async function getPortfolios(
  options?: { skip?: number; limit?: number; favoritesOnly?: boolean }
): Promise<PortfolioListResponse> {
  const params = new URLSearchParams();
  if (options?.skip) params.append("skip", options.skip.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.favoritesOnly) params.append("favorites_only", "true");

  const response = await fetch(
    getApiUrl(`/portfolios${params.toString() ? `?${params}` : ""}`),
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch portfolios");
  }

  return response.json();
}

export async function getPortfolio(id: number): Promise<SavedPortfolio> {
  const response = await fetch(getApiUrl(`/portfolios/${id}`), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch portfolio");
  }

  return response.json();
}

export async function updatePortfolio(
  id: number,
  data: PortfolioUpdate
): Promise<SavedPortfolio> {
  const response = await fetch(getApiUrl(`/portfolios/${id}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update portfolio");
  }

  return response.json();
}

export async function deletePortfolio(id: number): Promise<void> {
  const response = await fetch(getApiUrl(`/portfolios/${id}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete portfolio");
  }
}

export async function togglePortfolioFavorite(
  id: number
): Promise<SavedPortfolio> {
  const response = await fetch(getApiUrl(`/portfolios/${id}/favorite`), {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to toggle favorite");
  }

  return response.json();
}

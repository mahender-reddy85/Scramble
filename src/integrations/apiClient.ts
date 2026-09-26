const handleUnauthorized = () => {
  localStorage.removeItem("token");
  window.location.href = "/auth";
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let errorMsg = res.status === 404 ? "Resource not found" : "API request failed";
    try {
      const data = await res.json();
      if (data && data.error) errorMsg = data.error;
    } catch {
      // Non-JSON error response
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const apiClient = {
  async get(url: string) {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
  async post(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  async put(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  async patch(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  async delete(url: string) {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

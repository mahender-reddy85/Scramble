const handleUnauthorized = () => {
  localStorage.removeItem("token");
  window.location.href = "/auth";
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error("API request failed");
  return res.json();
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const apiClient = {
  async get(url: string) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async post(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async patch(url: string, body: Record<string, unknown>) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(url: string) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  }
};

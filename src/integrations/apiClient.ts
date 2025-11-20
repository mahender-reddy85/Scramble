const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = {
  async get(url: string) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async post(url: string, body: any) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async put(url: string, body: any) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async patch(url: string, body: any) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  }
};

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

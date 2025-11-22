export const apiClient = {
  async get(url: string) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async post(url: string, body: Record<string, unknown>) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async put(url: string, body: any) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  },

  async patch(url: string, body: any) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }

    if (!res.ok) throw new Error("API request failed");
    return res.json();
  }
};

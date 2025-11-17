export const apiClient = {
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },

  get: async (endpoint: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },

  patch: async (endpoint: string, data: any) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },
};

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

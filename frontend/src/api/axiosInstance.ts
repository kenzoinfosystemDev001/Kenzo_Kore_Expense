import axios from 'axios';

const resolveApiBaseUrl = (): string => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').trim();
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kenzo_kore_jwt');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - session token expired or invalid');
      // Do not clear token aggressively if network error; only on explicit 401 API response
      if (localStorage.getItem('kenzo_kore_jwt')) {
        localStorage.removeItem('kenzo_kore_jwt');
      }
    }
    return Promise.reject(error);
  }
);

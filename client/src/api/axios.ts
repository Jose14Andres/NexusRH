import axios from 'axios';
import { getAccessToken, setAccessToken } from '../features/auth/tokenStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // envía cookies (refresh token)
});

// Adjuntar access token a cada request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cola de requests que esperan el refresh
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(err: unknown, token: string | null = null) {
  pendingQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
}

// Interceptor de respuesta: reintento automático tras 401
api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      setAccessToken(data.accessToken);
      drainQueue(null, data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(refreshErr, null);
      setAccessToken(null);
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;

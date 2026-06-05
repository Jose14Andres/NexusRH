import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import axios from 'axios';
import api from '../../api/axios';
import { getAccessToken, setAccessToken } from './tokenStore';

export interface AuthUser {
  id: string;
  username: string;
  roles: string[];
  permisos: string[];
  empleadoId?: string | null;
  departamentoId?: string | null;
  empleado?: {
    nombres: string;
    apellidos: string;
    email: string;
    cargo: string;
    departamento: string;
  } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (codigo: string) => boolean;
  hasRole: (rol: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar: intentar restaurar sesión vía refresh token (cookie httpOnly)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        const { data: me } = await api.get<AuthUser>('/auth/me');
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { username, password },
    );
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await api.post('/auth/logout');
      }
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (codigo: string) => user?.permisos.includes(codigo) ?? false,
    [user],
  );

  const hasRole = useCallback(
    (rol: string) => user?.roles.includes(rol) ?? false,
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

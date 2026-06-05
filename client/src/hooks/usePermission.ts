import { useAuth } from '../features/auth/AuthContext';

export function usePermission(codigo: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(codigo);
}

export function useAnyPermission(codigos: string[]): boolean {
  const { hasPermission } = useAuth();
  return codigos.some(c => hasPermission(c));
}

export function useAllPermissions(codigos: string[]): boolean {
  const { hasPermission } = useAuth();
  return codigos.every(c => hasPermission(c));
}

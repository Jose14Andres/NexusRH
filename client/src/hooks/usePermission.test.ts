import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission, useAnyPermission, useAllPermissions } from './usePermission';
import { useAuth } from '../features/auth/AuthContext';

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('usePermission hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePermission', () => {
    it('returns true if user has permission', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => code === 'PERM_1',
      } as any);

      const { result } = renderHook(() => usePermission('PERM_1'));
      expect(result.current).toBe(true);
    });

    it('returns false if user does not have permission', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => code === 'PERM_1',
      } as any);

      const { result } = renderHook(() => usePermission('PERM_2'));
      expect(result.current).toBe(false);
    });
  });

  describe('useAnyPermission', () => {
    it('returns true if user has at least one permission', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => ['PERM_1', 'PERM_3'].includes(code),
      } as any);

      const { result } = renderHook(() => useAnyPermission(['PERM_2', 'PERM_3']));
      expect(result.current).toBe(true);
    });

    it('returns false if user has none of the permissions', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => ['PERM_1', 'PERM_3'].includes(code),
      } as any);

      const { result } = renderHook(() => useAnyPermission(['PERM_2', 'PERM_4']));
      expect(result.current).toBe(false);
    });

    it('returns false if empty array is provided', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: () => true,
      } as any);

      const { result } = renderHook(() => useAnyPermission([]));
      expect(result.current).toBe(false);
    });
  });

  describe('useAllPermissions', () => {
    it('returns true if user has all permissions', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => ['PERM_1', 'PERM_2', 'PERM_3'].includes(code),
      } as any);

      const { result } = renderHook(() => useAllPermissions(['PERM_1', 'PERM_2']));
      expect(result.current).toBe(true);
    });

    it('returns false if user is missing at least one permission', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: (code: string) => ['PERM_1', 'PERM_3'].includes(code),
      } as any);

      const { result } = renderHook(() => useAllPermissions(['PERM_1', 'PERM_2']));
      expect(result.current).toBe(false);
    });

    it('returns true if empty array is provided', () => {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: () => false,
      } as any);

      const { result } = renderHook(() => useAllPermissions([]));
      expect(result.current).toBe(true); // .every on empty array is true
    });
  });
});

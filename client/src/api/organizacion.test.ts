import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizacionApi } from './organizacion';
import api from './axios';

vi.mock('./axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('organizacionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganizacion = {
    id: '1',
    nombre: 'Test Org',
    tipo: 'PUBLICA',
    ruc: '12345678901',
    direccion: 'Test Dir',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _count: { departamentos: 0 },
  };

  describe('list', () => {
    it('should call api.get with correct url and return data', async () => {
      const mockData = [mockOrganizacion];
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

      const result = await organizacionApi.list();

      expect(api.get).toHaveBeenCalledWith('/organizaciones');
      expect(result).toEqual(mockData);
    });

    it('should throw an error if api.get fails', async () => {
      const error = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(error);

      await expect(organizacionApi.list()).rejects.toThrow(error);
    });
  });

  describe('getById', () => {
    it('should call api.get with correct url and return data', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockOrganizacion });

      const result = await organizacionApi.getById('1');

      expect(api.get).toHaveBeenCalledWith('/organizaciones/1');
      expect(result).toEqual(mockOrganizacion);
    });

    it('should throw an error if api.get fails', async () => {
      const error = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(error);

      await expect(organizacionApi.getById('1')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const dto = {
      nombre: 'Test Org',
      tipo: 'PUBLICA' as const,
      ruc: '12345678901',
      direccion: 'Test Dir',
    };

    it('should call api.post with correct url and payload and return data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockOrganizacion });

      const result = await organizacionApi.create(dto);

      expect(api.post).toHaveBeenCalledWith('/organizaciones', dto);
      expect(result).toEqual(mockOrganizacion);
    });

    it('should throw an error if api.post fails', async () => {
      const error = new Error('Network error');
      vi.mocked(api.post).mockRejectedValueOnce(error);

      await expect(organizacionApi.create(dto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const dto = {
      nombre: 'Updated Org',
    };

    it('should call api.put with correct url and payload and return data', async () => {
      const updatedOrganizacion = { ...mockOrganizacion, nombre: 'Updated Org' };
      vi.mocked(api.put).mockResolvedValueOnce({ data: updatedOrganizacion });

      const result = await organizacionApi.update('1', dto);

      expect(api.put).toHaveBeenCalledWith('/organizaciones/1', dto);
      expect(result).toEqual(updatedOrganizacion);
    });

    it('should throw an error if api.put fails', async () => {
      const error = new Error('Network error');
      vi.mocked(api.put).mockRejectedValueOnce(error);

      await expect(organizacionApi.update('1', dto)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should call api.delete with correct url and return data', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });

      const result = await organizacionApi.remove('1');

      expect(api.delete).toHaveBeenCalledWith('/organizaciones/1');
      expect(result).toEqual({ success: true });
    });

    it('should throw an error if api.delete fails', async () => {
      const error = new Error('Network error');
      vi.mocked(api.delete).mockRejectedValueOnce(error);

      await expect(organizacionApi.remove('1')).rejects.toThrow(error);
    });
  });
});

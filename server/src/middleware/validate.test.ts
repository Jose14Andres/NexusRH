import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, zPaginacion, zId } from './validate';

describe('zId', () => {
  it('should accept valid cuid', () => {
    const result = zId.safeParse('clhn9g3d2000008l4f1bz6b0s'); // valid cuid
    expect(result.success).toBe(true);
  });

  it('should reject invalid cuid', () => {
    const result = zId.safeParse('invalid-cuid-string');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('ID inválido');
    }
  });

  it('should reject numbers', () => {
    const result = zId.safeParse(12345);
    expect(result.success).toBe(false);
  });
});

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const testSchema = z.object({
    name: z.string().min(3),
    age: z.number().int().positive()
  });

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call next and populate target if validation succeeds', () => {
    mockReq.body = { name: 'Alice', age: 30 };
    const middleware = validate(testSchema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockReq.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('should return 400 with details if validation fails', () => {
    mockReq.body = { name: 'Al', age: -5 };
    const middleware = validate(testSchema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Datos de entrada inválidos',
      detalles: expect.any(Object)
    });
  });

  it('should validate target params if specified', () => {
    mockReq.params = { id: 'clhn9g3d2000008l4f1bz6b0s' };
    const middleware = validate(z.object({ id: zId }), 'params');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockReq.params).toEqual({ id: 'clhn9g3d2000008l4f1bz6b0s' });
  });
});

describe('zPaginacion', () => {
  it('should use default values when no input is provided', () => {
    const result = zPaginacion.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 1, limit: 20 });
    }
  });

  it('should accept valid custom inputs', () => {
    const result = zPaginacion.safeParse({ page: 5, limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 5, limit: 50 });
    }
  });

  it('should coerce string numbers to numbers', () => {
    const result = zPaginacion.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 2, limit: 10 });
    }
  });

  it('should reject non-integer page', () => {
    const result = zPaginacion.safeParse({ page: 1.5 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer limit', () => {
    const result = zPaginacion.safeParse({ limit: 10.5 });
    expect(result.success).toBe(false);
  });

  it('should reject page less than 1 (zero)', () => {
    const result = zPaginacion.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject page less than 1 (negative)', () => {
    const result = zPaginacion.safeParse({ page: -5 });
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1 (zero)', () => {
    const result = zPaginacion.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1 (negative)', () => {
    const result = zPaginacion.safeParse({ limit: -10 });
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = zPaginacion.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should accept limit exactly 100', () => {
    const result = zPaginacion.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
  });

  it('should handle huge page numbers', () => {
    const result = zPaginacion.safeParse({ page: 999999999 });
    expect(result.success).toBe(true);
  });
});

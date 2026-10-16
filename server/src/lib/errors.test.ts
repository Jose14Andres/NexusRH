import { Prisma } from '@prisma/client';
import { Response } from 'express';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  handleDbError,
  sendError
} from './errors';

describe('Custom Errors', () => {
  it('NotFoundError should be instantiated correctly', () => {
    const error = new NotFoundError('Not found');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Not found');
  });

  it('ConflictError should be instantiated correctly', () => {
    const error = new ConflictError('Conflict');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Conflict');
  });

  it('ValidationError should be instantiated correctly', () => {
    const error = new ValidationError('Validation error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation error');
  });
});

describe('handleDbError', () => {
  it('should throw ConflictError for P2002', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P2002',
      clientVersion: '1.0.0'
    });
    expect(() => handleDbError(prismaError)).toThrow(ConflictError);
    expect(() => handleDbError(prismaError)).toThrow('Ya existe un registro con esos datos únicos');
  });

  it('should throw NotFoundError for P2025', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P2025',
      clientVersion: '1.0.0'
    });
    expect(() => handleDbError(prismaError)).toThrow(NotFoundError);
    expect(() => handleDbError(prismaError)).toThrow('Registro no encontrado');
  });

  it('should throw ConflictError for P2003', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P2003',
      clientVersion: '1.0.0'
    });
    expect(() => handleDbError(prismaError)).toThrow(ConflictError);
    expect(() => handleDbError(prismaError)).toThrow('No se puede eliminar: tiene registros relacionados');
  });

  it('should throw ConflictError for P2014', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P2014',
      clientVersion: '1.0.0'
    });
    expect(() => handleDbError(prismaError)).toThrow(ConflictError);
    expect(() => handleDbError(prismaError)).toThrow('La relación requerida no existe');
  });

  it('should rethrow PrismaClientKnownRequestError with unhandled code', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P9999',
      clientVersion: '1.0.0'
    });
    expect(() => handleDbError(prismaError)).toThrow(Prisma.PrismaClientKnownRequestError);
    expect(() => handleDbError(prismaError)).toThrow('Error');
  });

  it('should rethrow unknown errors', () => {
    const unknownError = new Error('Unknown error');
    expect(() => handleDbError(unknownError)).toThrow(Error);
    expect(() => handleDbError(unknownError)).toThrow('Unknown error');
  });
});

describe('sendError', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send 404 for NotFoundError', () => {
    const error = new NotFoundError('Not found error');
    sendError(mockRes as Response, error);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not found error' });
  });

  it('should send 409 for ConflictError', () => {
    const error = new ConflictError('Conflict error');
    sendError(mockRes as Response, error);
    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Conflict error' });
  });

  it('should send 400 for ValidationError', () => {
    const error = new ValidationError('Validation error');
    sendError(mockRes as Response, error);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
  });

  it('should send 500 and log for unknown error', () => {
    const error = new Error('Unknown error');
    sendError(mockRes as Response, error);
    expect(console.error).toHaveBeenCalledWith('[server]', error);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});

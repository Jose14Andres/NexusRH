import { Prisma } from '@prisma/client';
import { Response } from 'express';

export class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}

export class ConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'ConflictError'; }
}

export class ValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

// Convierte errores de Prisma a errores de dominio
export function handleDbError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        throw new ConflictError('Ya existe un registro con esos datos únicos');
      case 'P2025':
        throw new NotFoundError('Registro no encontrado');
      case 'P2003':
        throw new ConflictError('No se puede eliminar: tiene registros relacionados');
      case 'P2014':
        throw new ConflictError('La relación requerida no existe');
    }
  }
  throw err;
}

// Helper para controllers: mapea errores de dominio a códigos HTTP
export function sendError(res: Response, err: unknown): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
  } else if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else {
    console.error('[server]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

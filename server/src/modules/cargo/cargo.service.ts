import { prisma } from '../../lib/prisma';
import { handleDbError, NotFoundError, ConflictError } from '../../lib/errors';
import { CreateCargo, UpdateCargo } from './cargo.schemas';

export async function findAll(departamentoId?: string) {
  return prisma.cargo.findMany({
    where: departamentoId ? { departamentoId } : undefined,
    include: {
      departamento: {
        select: {
          id: true,
          nombre: true,
          organizacion: { select: { id: true, nombre: true } },
        },
      },
      _count: { select: { empleados: true } },
    },
    orderBy: [{ departamento: { nombre: 'asc' } }, { nombre: 'asc' }],
  });
}

export async function findById(id: string) {
  const cargo = await prisma.cargo.findUnique({
    where: { id },
    include: {
      departamento: {
        select: {
          id: true,
          nombre: true,
          organizacion: { select: { id: true, nombre: true } },
        },
      },
      _count: { select: { empleados: true } },
    },
  });
  if (!cargo) throw new NotFoundError('Cargo no encontrado');
  return cargo;
}

export async function create(data: CreateCargo) {
  const dept = await prisma.departamento.findUnique({ where: { id: data.departamentoId } });
  if (!dept) throw new NotFoundError('Departamento no encontrado');
  try {
    return await prisma.cargo.create({
      data,
      include: {
        departamento: {
          select: { id: true, nombre: true, organizacion: { select: { nombre: true } } },
        },
      },
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function update(id: string, data: UpdateCargo) {
  await findById(id);
  if (data.departamentoId) {
    const dept = await prisma.departamento.findUnique({ where: { id: data.departamentoId } });
    if (!dept) throw new NotFoundError('Departamento no encontrado');
  }
  try {
    return await prisma.cargo.update({
      where: { id },
      data,
      include: {
        departamento: {
          select: { id: true, nombre: true, organizacion: { select: { nombre: true } } },
        },
      },
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function remove(id: string) {
  await findById(id);
  const count = await prisma.empleado.count({ where: { cargoId: id } });
  if (count > 0) {
    throw new ConflictError(`No se puede eliminar: ${count} empleado(s) tienen este cargo`);
  }
  try {
    await prisma.cargo.delete({ where: { id } });
  } catch (err) {
    handleDbError(err);
  }
}

import { prisma } from '../../lib/prisma';
import { handleDbError, NotFoundError, ConflictError } from '../../lib/errors';
import { CreateDepartamento, UpdateDepartamento } from './departamento.schemas';

export async function findAll(organizacionId?: string) {
  return prisma.departamento.findMany({
    where: organizacionId ? { organizacionId } : undefined,
    include: {
      organizacion: { select: { id: true, nombre: true } },
      _count: { select: { cargos: true, empleados: true } },
    },
    orderBy: [{ organizacion: { nombre: 'asc' } }, { nombre: 'asc' }],
  });
}

export async function findById(id: string) {
  const dept = await prisma.departamento.findUnique({
    where: { id },
    include: {
      organizacion: { select: { id: true, nombre: true } },
      cargos: { orderBy: { nombre: 'asc' } },
      _count: { select: { empleados: true } },
    },
  });
  if (!dept) throw new NotFoundError('Departamento no encontrado');
  return dept;
}

export async function create(data: CreateDepartamento) {
  // Verificar que la organización existe
  const org = await prisma.organizacion.findUnique({ where: { id: data.organizacionId } });
  if (!org) throw new NotFoundError('Organización no encontrada');
  try {
    return await prisma.departamento.create({
      data,
      include: { organizacion: { select: { id: true, nombre: true } } },
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function update(id: string, data: UpdateDepartamento) {
  await findById(id);
  if (data.organizacionId) {
    const org = await prisma.organizacion.findUnique({ where: { id: data.organizacionId } });
    if (!org) throw new NotFoundError('Organización no encontrada');
  }
  try {
    return await prisma.departamento.update({
      where: { id },
      data,
      include: { organizacion: { select: { id: true, nombre: true } } },
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function remove(id: string) {
  await findById(id);
  const [empleados, cargos] = await Promise.all([
    prisma.empleado.count({ where: { departamentoId: id } }),
    prisma.cargo.count({ where: { departamentoId: id } }),
  ]);
  if (empleados > 0 || cargos > 0) {
    const partes: string[] = [];
    if (empleados > 0) partes.push(`${empleados} empleado(s)`);
    if (cargos > 0) partes.push(`${cargos} cargo(s)`);
    throw new ConflictError(`No se puede eliminar: tiene ${partes.join(' y ')} asociado(s)`);
  }
  try {
    await prisma.departamento.delete({ where: { id } });
  } catch (err) {
    handleDbError(err);
  }
}

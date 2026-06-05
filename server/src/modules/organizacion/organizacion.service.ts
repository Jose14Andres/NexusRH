import { prisma } from '../../lib/prisma';
import { handleDbError, NotFoundError, ConflictError } from '../../lib/errors';
import { CreateOrganizacion, UpdateOrganizacion } from './organizacion.schemas';

export async function findAll() {
  return prisma.organizacion.findMany({
    include: { _count: { select: { departamentos: true } } },
    orderBy: { nombre: 'asc' },
  });
}

export async function findById(id: string) {
  const org = await prisma.organizacion.findUnique({
    where: { id },
    include: {
      departamentos: {
        include: { _count: { select: { cargos: true, empleados: true } } },
        orderBy: { nombre: 'asc' },
      },
    },
  });
  if (!org) throw new NotFoundError('Organización no encontrada');
  return org;
}

export async function create(data: CreateOrganizacion) {
  try {
    return await prisma.organizacion.create({ data });
  } catch (err) {
    handleDbError(err);
  }
}

export async function update(id: string, data: UpdateOrganizacion) {
  await findById(id); // valida existencia
  try {
    return await prisma.organizacion.update({ where: { id }, data });
  } catch (err) {
    handleDbError(err);
  }
}

export async function remove(id: string) {
  await findById(id);
  const deptCount = await prisma.departamento.count({ where: { organizacionId: id } });
  if (deptCount > 0) {
    throw new ConflictError(
      `No se puede eliminar: tiene ${deptCount} departamento(s) asociado(s)`,
    );
  }
  try {
    await prisma.organizacion.delete({ where: { id } });
  } catch (err) {
    handleDbError(err);
  }
}

import {
  resolveIndividualEmpleadoId,
  resolveDeptFilter,
  assertCanReadOrg,
  normalizePeriodo,
  ViewerContext,
} from '../estadisticas.service';
import { ForbiddenError } from '../../../lib/errors';

// ─── Fixtures ─────────────────────────────────────────────

const EMP_ID  = 'emp-001';
const DEPT_ID = 'dept-001';

const v = (roles: string[], opts: Partial<ViewerContext> = {}): ViewerContext => ({
  roles,
  sub: 'u-test',
  empleadoId:     EMP_ID,
  departamentoId: DEPT_ID,
  ...opts,
});

// ─── resolveIndividualEmpleadoId ──────────────────────────

describe('resolveIndividualEmpleadoId', () => {
  it('EMPLEADO: ignora queryId y devuelve su propio empleadoId', () => {
    expect(resolveIndividualEmpleadoId('otro-id', v(['EMPLEADO']))).toBe(EMP_ID);
  });

  it('EMPLEADO sin empleadoId en ctx: devuelve undefined', () => {
    expect(resolveIndividualEmpleadoId('otro-id', v(['EMPLEADO'], { empleadoId: null }))).toBeUndefined();
  });

  it('SUPERVISOR: ignora queryId y devuelve su propio empleadoId', () => {
    expect(resolveIndividualEmpleadoId('otro-id', v(['SUPERVISOR']))).toBe(EMP_ID);
  });

  it('RRHH: respeta el queryId proporcionado', () => {
    expect(resolveIndividualEmpleadoId('otro-id', v(['RRHH']))).toBe('otro-id');
  });

  it('RRHH: devuelve undefined si no se da queryId', () => {
    expect(resolveIndividualEmpleadoId(undefined, v(['RRHH']))).toBeUndefined();
  });

  it('CONTABILIDAD: respeta el queryId proporcionado', () => {
    expect(resolveIndividualEmpleadoId('emp-xyz', v(['CONTABILIDAD']))).toBe('emp-xyz');
  });

  it('ADMIN: respeta el queryId proporcionado', () => {
    expect(resolveIndividualEmpleadoId('emp-xyz', v(['ADMIN']))).toBe('emp-xyz');
  });
});

// ─── resolveDeptFilter ────────────────────────────────────

describe('resolveDeptFilter', () => {
  it('EMPLEADO: lanza ForbiddenError sin importar el queryId', () => {
    expect(() => resolveDeptFilter('dept-x', v(['EMPLEADO']))).toThrow(ForbiddenError);
  });

  it('EMPLEADO sin queryId: también lanza ForbiddenError', () => {
    expect(() => resolveDeptFilter(undefined, v(['EMPLEADO']))).toThrow(ForbiddenError);
  });

  it('SUPERVISOR: ignora queryId y devuelve su propio departamentoId', () => {
    expect(resolveDeptFilter('dept-x', v(['SUPERVISOR']))).toBe(DEPT_ID);
  });

  it('SUPERVISOR sin departamentoId en ctx: devuelve undefined', () => {
    expect(resolveDeptFilter('dept-x', v(['SUPERVISOR'], { departamentoId: null }))).toBeUndefined();
  });

  it('RRHH: respeta el queryId proporcionado', () => {
    expect(resolveDeptFilter('dept-x', v(['RRHH']))).toBe('dept-x');
  });

  it('RRHH sin queryId: devuelve undefined (todas las departamentos)', () => {
    expect(resolveDeptFilter(undefined, v(['RRHH']))).toBeUndefined();
  });

  it('CONTABILIDAD: respeta el queryId proporcionado', () => {
    expect(resolveDeptFilter('dept-x', v(['CONTABILIDAD']))).toBe('dept-x');
  });

  it('ADMIN: respeta el queryId proporcionado', () => {
    expect(resolveDeptFilter('dept-x', v(['ADMIN']))).toBe('dept-x');
  });
});

// ─── assertCanReadOrg ─────────────────────────────────────

describe('assertCanReadOrg', () => {
  it('EMPLEADO: lanza ForbiddenError', () => {
    expect(() => assertCanReadOrg(v(['EMPLEADO']))).toThrow(ForbiddenError);
  });

  it('SUPERVISOR: lanza ForbiddenError', () => {
    expect(() => assertCanReadOrg(v(['SUPERVISOR']))).toThrow(ForbiddenError);
  });

  it('RRHH: no lanza', () => {
    expect(() => assertCanReadOrg(v(['RRHH']))).not.toThrow();
  });

  it('CONTABILIDAD: no lanza', () => {
    expect(() => assertCanReadOrg(v(['CONTABILIDAD']))).not.toThrow();
  });

  it('ADMIN: no lanza', () => {
    expect(() => assertCanReadOrg(v(['ADMIN']))).not.toThrow();
  });
});

// ─── normalizePeriodo ─────────────────────────────────────

describe('normalizePeriodo', () => {
  it('mes de un dígito se rellena con cero', () => {
    expect(normalizePeriodo(3, 2024)).toBe('2024-03');
  });

  it('mes de dos dígitos no se modifica', () => {
    expect(normalizePeriodo(12, 2024)).toBe('2024-12');
  });

  it('mes enero retorna 01', () => {
    expect(normalizePeriodo(1, 2025)).toBe('2025-01');
  });
});

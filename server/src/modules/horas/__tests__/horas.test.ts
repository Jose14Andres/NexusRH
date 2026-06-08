import {
  assertTransicionValida,
  buildResumen,
  canApprove,
} from '../horas.service';
import { ConflictError } from '../../../lib/errors';
import { createHorasSchema } from '../horas.schemas';

// ─── assertTransicionValida ───────────────────────────────
describe('assertTransicionValida', () => {
  it('PENDIENTE → aprobar: no lanza', () => {
    expect(() => assertTransicionValida('PENDIENTE', 'aprobar')).not.toThrow();
  });

  it('PENDIENTE → rechazar: no lanza', () => {
    expect(() => assertTransicionValida('PENDIENTE', 'rechazar')).not.toThrow();
  });

  it('APROBADO → aprobar: lanza ConflictError', () => {
    expect(() => assertTransicionValida('APROBADO', 'aprobar')).toThrow(ConflictError);
  });

  it('RECHAZADO → rechazar: lanza ConflictError', () => {
    expect(() => assertTransicionValida('RECHAZADO', 'rechazar')).toThrow(ConflictError);
  });

  it('APROBADO → rechazar: lanza ConflictError', () => {
    expect(() => assertTransicionValida('APROBADO', 'rechazar')).toThrow(ConflictError);
  });
});

// ─── canApprove ──────────────────────────────────────────
describe('canApprove', () => {
  const deptA = 'dept-a';
  const deptB = 'dept-b';

  it('ADMIN siempre puede aprobar', () => {
    expect(canApprove(deptA, { roles: ['ADMIN'], sub: 'u1', departamentoId: deptB })).toBe(true);
  });

  it('RRHH siempre puede aprobar', () => {
    expect(canApprove(deptA, { roles: ['RRHH'], sub: 'u1', departamentoId: undefined })).toBe(true);
  });

  it('SUPERVISOR mismo departamento puede aprobar', () => {
    expect(canApprove(deptA, { roles: ['SUPERVISOR'], sub: 'u1', departamentoId: deptA })).toBe(true);
  });

  it('SUPERVISOR otro departamento NO puede aprobar', () => {
    expect(canApprove(deptA, { roles: ['SUPERVISOR'], sub: 'u1', departamentoId: deptB })).toBe(false);
  });

  it('EMPLEADO no puede aprobar', () => {
    expect(canApprove(deptA, { roles: ['EMPLEADO'], sub: 'u1', departamentoId: deptA })).toBe(false);
  });
});

// ─── buildResumen ─────────────────────────────────────────
describe('buildResumen', () => {
  const registros = [
    { horasNormales: 8, horasExtras: 2, estado: 'APROBADO'  },
    { horasNormales: 8, horasExtras: 3, estado: 'APROBADO'  },
    { horasNormales: 8, horasExtras: 4, estado: 'PENDIENTE' },
    { horasNormales: 8, horasExtras: 1, estado: 'RECHAZADO' },
  ];

  it('suma solo horasExtras de registros APROBADOS', () => {
    expect(buildResumen(registros).horasExtras).toBe(5);
  });

  it('suma solo horasNormales de registros APROBADOS', () => {
    expect(buildResumen(registros).horasNormales).toBe(16);
  });

  it('devuelve 0 si no hay aprobados', () => {
    const solo = [{ horasNormales: 8, horasExtras: 2, estado: 'PENDIENTE' }];
    expect(buildResumen(solo).horasExtras).toBe(0);
    expect(buildResumen(solo).totalRegistros).toBe(0);
  });

  it('cuenta correctamente totalRegistros', () => {
    expect(buildResumen(registros).totalRegistros).toBe(2);
  });
});

// ─── Validación Zod ───────────────────────────────────────
describe('createHorasSchema validaciones', () => {
  const base = {
    empleadoId:    'emp-001',
    fecha:         '2024-01-15',
    horasNormales: 8,
    horasExtras:   0,
  };

  it('acepta datos válidos', () => {
    expect(createHorasSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza horas negativas', () => {
    const r = createHorasSchema.safeParse({ ...base, horasNormales: -1 });
    expect(r.success).toBe(false);
  });

  it('rechaza suma > 24 horas', () => {
    const r = createHorasSchema.safeParse({ ...base, horasNormales: 20, horasExtras: 6 });
    expect(r.success).toBe(false);
  });

  it('rechaza fecha futura', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const r = createHorasSchema.safeParse({ ...base, fecha: tomorrow.toISOString().slice(0, 10) });
    expect(r.success).toBe(false);
  });

  it('acepta fecha de hoy', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(createHorasSchema.safeParse({ ...base, fecha: today }).success).toBe(true);
  });

  it('acepta fecha pasada', () => {
    expect(createHorasSchema.safeParse({ ...base, fecha: '2023-06-01' }).success).toBe(true);
  });
});

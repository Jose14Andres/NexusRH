import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Permisos del sistema ────────────────────────────────
const PERMISOS = [
  // Organización
  { codigo: 'organizacion:read',    modulo: 'organizacion', accion: 'read'    },
  { codigo: 'organizacion:write',   modulo: 'organizacion', accion: 'write'   },
  // Departamento
  { codigo: 'departamento:read',    modulo: 'departamento', accion: 'read'    },
  { codigo: 'departamento:write',   modulo: 'departamento', accion: 'write'   },
  { codigo: 'departamento:delete',  modulo: 'departamento', accion: 'delete'  },
  // Cargo
  { codigo: 'cargo:read',           modulo: 'cargo',        accion: 'read'    },
  { codigo: 'cargo:write',          modulo: 'cargo',        accion: 'write'   },
  { codigo: 'cargo:delete',         modulo: 'cargo',        accion: 'delete'  },
  // Empleado
  { codigo: 'empleado:read',        modulo: 'empleado',     accion: 'read'    },
  { codigo: 'empleado:write',       modulo: 'empleado',     accion: 'write'   },
  { codigo: 'empleado:delete',      modulo: 'empleado',     accion: 'delete'  },
  { codigo: 'empleado:export',      modulo: 'empleado',     accion: 'export'  },
  // Afiliación
  { codigo: 'afiliacion:read',      modulo: 'afiliacion',   accion: 'read'    },
  { codigo: 'afiliacion:write',     modulo: 'afiliacion',   accion: 'write'   },
  // Horas
  { codigo: 'horas:read',           modulo: 'horas',        accion: 'read'    },
  { codigo: 'horas:write',          modulo: 'horas',        accion: 'write'   },
  { codigo: 'horas:approve',        modulo: 'horas',        accion: 'approve' },
  { codigo: 'horas:export',         modulo: 'horas',        accion: 'export'  },
  // Nómina
  { codigo: 'nomina:read',          modulo: 'nomina',       accion: 'read'    },
  { codigo: 'nomina:write',         modulo: 'nomina',       accion: 'write'   },
  { codigo: 'nomina:approve',       modulo: 'nomina',       accion: 'approve' },
  { codigo: 'nomina:export',        modulo: 'nomina',       accion: 'export'  },
  { codigo: 'nomina:config',        modulo: 'nomina',       accion: 'config'  },
  // Estadísticas
  { codigo: 'estadisticas:read',    modulo: 'estadisticas', accion: 'read'    },
  { codigo: 'estadisticas:export',  modulo: 'estadisticas', accion: 'export'  },
  // Usuario
  { codigo: 'usuario:read',         modulo: 'usuario',      accion: 'read'    },
  { codigo: 'usuario:manage',       modulo: 'usuario',      accion: 'manage'  },
  // Auditoría
  { codigo: 'auditoria:read',       modulo: 'auditoria',    accion: 'read'    },
  // Configuración
  { codigo: 'config:manage',        modulo: 'config',       accion: 'manage'  },
];

// ─── Matriz Rol → Permisos ───────────────────────────────
const ROL_PERMISOS: Record<string, string[]> = {
  ADMIN: PERMISOS.map(p => p.codigo), // todos

  RRHH: [
    'organizacion:read',
    'departamento:read', 'departamento:write',
    'cargo:read', 'cargo:write',
    'empleado:read', 'empleado:write', 'empleado:export',
    'afiliacion:read', 'afiliacion:write',
    'horas:read', 'horas:write', 'horas:approve', 'horas:export',
    'nomina:read', 'nomina:write', 'nomina:approve', 'nomina:export',
    'estadisticas:read', 'estadisticas:export',
  ],

  CONTABILIDAD: [
    'organizacion:read',
    'departamento:read',
    'cargo:read',
    'empleado:read',
    'afiliacion:read',
    'nomina:read', 'nomina:write', 'nomina:export',
    'estadisticas:read', 'estadisticas:export',
  ],

  SUPERVISOR: [
    'organizacion:read',
    'departamento:read',
    'cargo:read',
    'empleado:read',
    'horas:read', 'horas:write', 'horas:approve',
    'estadisticas:read',
  ],

  EMPLEADO: [
    'empleado:read',
    'afiliacion:read',
    'horas:read', 'horas:write',
    'nomina:read', 'nomina:export',
    'estadisticas:read',
  ],
};

async function main() {
  console.log('🌱 Iniciando seed de NexusRH...');

  // 1. Configuración de nómina (IESS Ecuador)
  await prisma.configuracionNomina.upsert({
    where: { id: 'config-nomina-default' },
    update: {},
    create: {
      id: 'config-nomina-default',
      aportePersonalPct: 0.0945,
      aportePatronalPct: 0.1215,
      valorHoraExtraPct: 0.25,
      fondosReservaPct:  0.0833,
      decimoTerceroPct:  0.0833,
      decimoCuartoPct:   0.0833,
      vigente: true,
    },
  });
  console.log('  ✓ Configuración de nómina IESS creada');

  // 2. Permisos
  await prisma.$transaction(
    PERMISOS.map(p =>
      prisma.permiso.upsert({
        where: { codigo: p.codigo },
        update: {},
        create: p,
      })
    )
  );
  console.log(`  ✓ ${PERMISOS.length} permisos creados`);

  // 3. Roles del sistema
  const rolesData = [
    { nombre: 'ADMIN',        descripcion: 'Control total del sistema' },
    { nombre: 'RRHH',         descripcion: 'Gestión de empleados, nómina y afiliaciones' },
    { nombre: 'CONTABILIDAD', descripcion: 'Lectura de nómina y reportes financieros' },
    { nombre: 'SUPERVISOR',   descripcion: 'Gestión de su departamento y aprobación de horas' },
    { nombre: 'EMPLEADO',     descripcion: 'Acceso solo a sus propios datos' },
  ];

  const roles: Record<string, string> = {};
  for (const r of rolesData) {
    const rol = await prisma.rolSistema.upsert({
      where: { nombre: r.nombre },
      update: {},
      create: r,
    });
    roles[r.nombre] = rol.id;
  }
  console.log('  ✓ 5 roles del sistema creados');

  // 4. Asignar permisos a roles
  for (const [rolNombre, codigosPermiso] of Object.entries(ROL_PERMISOS)) {
    const rolId = roles[rolNombre];
    const permisos = await prisma.permiso.findMany({
      where: { codigo: { in: codigosPermiso } },
    });

    await prisma.$transaction(
      permisos.map(p =>
        prisma.rolPermiso.upsert({
          where: { rolId_permisoId: { rolId, permisoId: p.id } },
          update: {},
          create: { rolId, permisoId: p.id },
        })
      )
    );
  }
  console.log('  ✓ Permisos asignados a roles');

  // 5. Usuario administrador
  const adminPassword = await bcrypt.hash('Admin1234!', 10);
  const adminUser = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      activo: true,
    },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId: { usuarioId: adminUser.id, rolId: roles['ADMIN'] } },
    update: {},
    create: { usuarioId: adminUser.id, rolId: roles['ADMIN'] },
  });
  console.log('  ✓ Usuario admin creado (admin / Admin1234!)');

  // 6. Organización de ejemplo
  const org = await prisma.organizacion.upsert({
    where: { ruc: '1790012345001' },
    update: {},
    create: {
      nombre: 'Empresa Demo S.A.',
      tipo: 'PRIVADA',
      ruc: '1790012345001',
      direccion: 'Av. Amazonas N37-29, Quito, Ecuador',
    },
  });

  const deptRRHH = await prisma.departamento.upsert({
    where: { nombre_organizacionId: { nombre: 'Recursos Humanos', organizacionId: org.id } },
    update: {},
    create: { nombre: 'Recursos Humanos', organizacionId: org.id },
  });

  await prisma.cargo.upsert({
    where: { id: 'cargo-analista-rrhh' },
    update: {},
    create: {
      id: 'cargo-analista-rrhh',
      nombre: 'Analista de RRHH',
      descripcion: 'Gestión de personal y nómina',
      departamentoId: deptRRHH.id,
      sueldoBase: 800.00,
      jornadaHoras: 8,
    },
  });
  console.log('  ✓ Organización y estructura de ejemplo creadas');

  console.log('\n✅ Seed completado exitosamente');
  console.log('   Usuario: admin');
  console.log('   Contraseña: Admin1234!');
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

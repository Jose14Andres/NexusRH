import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    app.listen(PORT, () => {
      console.log(`🚀 NexusRH API corriendo en http://localhost:${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

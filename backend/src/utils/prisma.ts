import { PrismaClient } from '@prisma/client';

// Singleton Prisma instance – shared across the app.
// This avoids connection pool exhaustion in long-running processes.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export default prisma;

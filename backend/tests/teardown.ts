import prisma from '../src/utils/prisma';

export default async function globalTeardown() {
  await prisma.$disconnect();
}

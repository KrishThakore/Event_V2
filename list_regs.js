
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const registrations = await prisma.registrations.findMany({
      where: {
        user: { email: 'joulestechnologies@gmail.com' }
      },
      include: {
        event: { select: { title: true } }
      }
    });
    console.log('Registrations:', JSON.stringify(registrations, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.registrations.deleteMany({
      where: {
        user: { email: 'joulestechnologies@gmail.com' }
      }
    });
    console.log('Result:', JSON.stringify(result));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');

const prismaLogs = ['warn', 'error'];
if (process.env.PRISMA_LOG_INFO === 'true') prismaLogs.unshift('info');
if (process.env.PRISMA_LOG_QUERIES === 'true') prismaLogs.unshift('query');

const prisma = new PrismaClient({
  log: prismaLogs,
});

module.exports = prisma;

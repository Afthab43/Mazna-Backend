import app from './app';
import { env } from './config/env';
import { logger } from './helpers/logger';
import { db, pool } from './config/db';
import { sql } from 'drizzle-orm';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 MAZNA ENTERPRISES ERP Backend running on port ${PORT} [${env.NODE_ENV}]`);
  try {
    await db.execute(sql`SELECT 1`);
    logger.info('✅ PostgreSQL Database connected successfully via Drizzle ORM');
  } catch (error) {
    logger.error('❌ PostgreSQL Database connection failed:', error);
  }
});

const gracefulShutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await pool.end();
    logger.info('PostgreSQL connection pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

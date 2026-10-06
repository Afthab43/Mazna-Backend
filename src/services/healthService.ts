import { db } from '../config/db';
import { sql } from 'drizzle-orm';

export class HealthService {
  public static async checkHealth() {
    let dbStatus = 'healthy';
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      dbStatus = 'unreachable';
    }

    return {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      orm: 'Drizzle ORM',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

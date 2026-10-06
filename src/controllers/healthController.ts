import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/healthService';

export class HealthController {
  public static async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HealthService.checkHealth();
      res.status(200).json({
        success: true,
        code: 'OK',
        message: 'MAZNA ENTERPRISES ERP API is operational',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

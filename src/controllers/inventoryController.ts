import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { inventoryItems, products, warehouses } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../helpers/appError';

export class InventoryController {
  public static async getInventoryOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await db
        .select({
          id: inventoryItems.id,
          productId: inventoryItems.productId,
          warehouseId: inventoryItems.warehouseId,
          binLocation: inventoryItems.binLocation,
          batchNumber: inventoryItems.batchNumber,
          quantityAvailable: inventoryItems.quantityAvailable,
          quantityAllocated: inventoryItems.quantityAllocated,
          reorderPoint: inventoryItems.reorderPoint,
          safetyStock: inventoryItems.safetyStock,
        })
        .from(inventoryItems);

      res.status(200).json({
        success: true,
        code: 'OK',
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inventoryId, newQuantity, reason } = req.body;

      if (!inventoryId || newQuantity === undefined) {
        throw new BadRequestError('inventoryId and newQuantity are required');
      }

      const updated = await db
        .update(inventoryItems)
        .set({
          quantityAvailable: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, inventoryId))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundError('Inventory item record not found');
      }

      res.status(200).json({
        success: true,
        code: 'INVENTORY_ADJUSTED',
        message: 'Stock adjusted successfully',
        data: updated[0],
      });
    } catch (error) {
      next(error);
    }
  }
}

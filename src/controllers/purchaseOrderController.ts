import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { purchaseOrders, purchaseOrderItems, suppliers, warehouses } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../helpers/appError';

export class PurchaseOrderController {
  public static async getPurchaseOrders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const poList = await db.select().from(purchaseOrders);

      res.status(200).json({
        success: true,
        code: 'OK',
        data: poList,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        supplierId,
        destinationWarehouseId,
        expectedDeliveryDate,
        paymentTerms,
        items,
        notes,
      } = req.body;

      if (!supplierId || !destinationWarehouseId || !items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('Supplier, destination warehouse, and line items are required');
      }

      const count = (await db.select().from(purchaseOrders)).length;
      const poNumber = `PO-2026-${String(count + 1).padStart(3, '0')}`;

      let subtotalPaise = BigInt(0);
      let taxPaise = BigInt(0);

      for (const item of items) {
        const itemTotal = BigInt(item.orderedQty) * BigInt(item.unitPricePaise);
        const itemTax = (itemTotal * BigInt(Math.round(item.taxRate || 18))) / BigInt(100);
        subtotalPaise += itemTotal;
        taxPaise += itemTax;
      }

      const totalPaise = subtotalPaise + taxPaise;

      const insertedPo = await db
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId,
          destinationWarehouseId,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          paymentTerms: paymentTerms || 'NET_30',
          status: 'DRAFT',
          subtotalPaise,
          taxPaise,
          totalPaise,
          notes: notes || null,
        })
        .returning();

      const newPo = insertedPo[0];

      for (const item of items) {
        const itemTotal = BigInt(item.orderedQty) * BigInt(item.unitPricePaise);
        await db.insert(purchaseOrderItems).values({
          poId: newPo.id,
          productId: item.productId,
          orderedQty: item.orderedQty,
          unitPricePaise: BigInt(item.unitPricePaise),
          taxRate: item.taxRate || 18.0,
          totalPaise: itemTotal,
        });
      }

      res.status(201).json({
        success: true,
        code: 'PO_CREATED',
        message: `Purchase order ${poNumber} created successfully`,
        data: newPo,
      });
    } catch (error) {
      next(error);
    }
  }
}

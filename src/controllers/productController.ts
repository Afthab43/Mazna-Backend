import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { products, categories, brands, taxes, inventoryItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../helpers/appError';

export class ProductController {
  public static async getProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productList = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          barcode: products.barcode,
          unit: products.unit,
          costPricePaise: products.costPricePaise,
          mrpPaise: products.mrpPaise,
          sellingPricePaise: products.sellingPricePaise,
          b2bPricePaise: products.b2bPricePaise,
          b2bMinQty: products.b2bMinQty,
          status: products.status,
          description: products.description,
          createdAt: products.createdAt,
          images: products.images,
          categoryName: categories.name,
          brandName: brands.name,
          taxRate: taxes.rate,
          hsnCode: products.hsnCode,
          stock: inventoryItems.quantityAvailable,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(taxes, eq(products.taxId, taxes.id))
        .leftJoin(inventoryItems, eq(products.id, inventoryItems.productId));

      res.status(200).json({
        success: true,
        code: 'OK',
        data: productList,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        sku,
        barcode,
        categoryId,
        categoryName,
        brandId,
        brandName,
        hsnCode,
        taxId,
        taxRate,
        unit,
        costPricePaise,
        mrpPaise,
        sellingPricePaise,
        b2bPricePaise,
        b2bMinQty,
        description,
        stock,
        images
      } = req.body;

      if (!name || !sku) {
        throw new BadRequestError('Product name and SKU are required');
      }

      const existingSku = await db.select().from(products).where(eq(products.sku, sku));
      if (existingSku.length > 0) {
        throw new BadRequestError('Product with this SKU already exists');
      }

      let finalCatId = categoryId;
      if (!finalCatId && categoryName) {
        const cat = await db.select().from(categories).where(eq(categories.name, categoryName));
        if (cat.length > 0) finalCatId = cat[0].id;
      }

      let finalBrandId = brandId;
      if (!finalBrandId && brandName) {
        const brand = await db.select().from(brands).where(eq(brands.name, brandName));
        if (brand.length > 0) finalBrandId = brand[0].id;
      }

      let finalTaxId = taxId;
      if (!finalTaxId && taxRate !== undefined) {
        const tax = await db.select().from(taxes).where(eq(taxes.rate, Number(taxRate)));
        if (tax.length > 0) finalTaxId = tax[0].id;
      }

      const inserted = await db
        .insert(products)
        .values({
          name,
          sku,
          barcode: barcode || null,
          categoryId: finalCatId || null,
          brandId: finalBrandId || null,
          hsnCode: hsnCode || null,
          taxId: finalTaxId || null,
          unit: unit || 'PCS',
          costPricePaise: BigInt(costPricePaise || 0),
          mrpPaise: BigInt(mrpPaise || 0),
          sellingPricePaise: BigInt(sellingPricePaise || 0),
          b2bPricePaise: b2bPricePaise ? BigInt(b2bPricePaise) : null,
          b2bMinQty: b2bMinQty || 1,
          description: description || null,
          images: images || [],
          status: 'ACTIVE',
        })
        .returning();

      res.status(201).json({
        success: true,
        code: 'PRODUCT_CREATED',
        message: 'Product added to catalog successfully',
        data: inserted[0],
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        sku,
        barcode,
        categoryId,
        categoryName,
        brandId,
        brandName,
        hsnCode,
        taxId,
        taxRate,
        unit,
        costPricePaise,
        mrpPaise,
        sellingPricePaise,
        b2bPricePaise,
        b2bMinQty,
        description,
        status,
        images
      } = req.body;

      const existing = await db.select().from(products).where(eq(products.id, id));
      if (existing.length === 0) {
        throw new NotFoundError('Product not found');
      }

      let finalCatId = categoryId;
      if (!finalCatId && categoryName) {
        const cat = await db.select().from(categories).where(eq(categories.name, categoryName));
        if (cat.length > 0) finalCatId = cat[0].id;
      }

      let finalBrandId = brandId;
      if (!finalBrandId && brandName) {
        const brand = await db.select().from(brands).where(eq(brands.name, brandName));
        if (brand.length > 0) finalBrandId = brand[0].id;
      }

      let finalTaxId = taxId;
      if (!finalTaxId && taxRate !== undefined) {
        const tax = await db.select().from(taxes).where(eq(taxes.rate, Number(taxRate)));
        if (tax.length > 0) finalTaxId = tax[0].id;
      }

      const updated = await db
        .update(products)
        .set({
          name,
          sku,
          barcode: barcode || null,
          categoryId: finalCatId || null,
          brandId: finalBrandId || null,
          hsnCode: hsnCode || null,
          taxId: finalTaxId || null,
          unit: unit || 'PCS',
          costPricePaise: BigInt(costPricePaise || 0),
          mrpPaise: BigInt(mrpPaise || 0),
          sellingPricePaise: BigInt(sellingPricePaise || 0),
          b2bPricePaise: b2bPricePaise ? BigInt(b2bPricePaise) : null,
          b2bMinQty: b2bMinQty || 1,
          description: description || null,
          images: images || [],
          status: status || 'ACTIVE',
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      res.status(200).json({
        success: true,
        code: 'PRODUCT_UPDATED',
        data: updated[0],
      });
    } catch (error) {
      next(error);
    }
  }
}

import { db, pool } from '../config/db';
import { products, categories, brands, taxes, inventoryItems, warehouses } from './schema';
import { eq, isNull } from 'drizzle-orm';

async function main() {
  console.log('Fixing NULL values in database...');
  
  const gst18 = (await db.select().from(taxes).where(eq(taxes.name, 'GST 18%')))[0];
  const wh = (await db.select().from(warehouses).where(eq(warehouses.code, 'WH-BLR-01')))[0];

  const extraProducts = [
    { name: 'Apple MacBook Pro M3', sku: 'APP-MBP-M3-14', barcode: '190199222333', cat: 'Computers', brand: 'Apple', cost: 12000000, price: 15990000, stock: 12, hsn: '84713010' },
    { name: 'Samsung 34" Ultrawide Monitor', sku: 'SAM-UW-34', barcode: '880111222333', cat: 'Peripherals', brand: 'Samsung', cost: 3500000, price: 4899900, stock: 5, hsn: '85285200' },
    { name: 'Sony WH-1000XM5 Headphones', sku: 'SONY-WH-M5-BLK', barcode: '4548736132573', cat: 'Electronics', brand: 'Sony', cost: 1800000, price: 2999000, stock: 45, hsn: '85183000' },
    { name: 'Herman Miller Aeron Chair', sku: 'HM-AERON-BLK', barcode: '990111222333', cat: 'Furniture', brand: 'Herman Miller', cost: 7500000, price: 11500000, stock: 8, hsn: '94013000' },
    { name: 'Stanley 65-Piece Tool Set', sku: 'STAN-TS-65', barcode: '890111222444', cat: 'Hardware Tools', brand: 'Stanley', cost: 220000, price: 380000, stock: 150, hsn: '82060010' },
    { name: '3M N95 Respirator Masks (Pack of 20)', sku: '3M-N95-20PK', barcode: '890111222555', cat: 'Safety Equipment & PPE', brand: '3M Safety', cost: 40000, price: 95000, stock: 320, hsn: '63079090' },
    { name: 'Makita 18V LXT Lithium-Ion Battery', sku: 'MAK-18V-BAT', barcode: '88381123456', cat: 'Power Tools & Machinery', brand: 'Makita', cost: 450000, price: 750000, stock: 0, hsn: '85076000' },
    { name: 'WD Black 2TB NVMe SSD', sku: 'WD-BLK-2TB', barcode: '718037856789', cat: 'Components', brand: 'Western Digital', cost: 1100000, price: 1599900, stock: 65, hsn: '85235100' },
    { name: 'Keychron K8 Pro Mechanical Keyboard', sku: 'KEY-K8-PRO', barcode: '697123456789', cat: 'Peripherals', brand: 'Keychron', cost: 420000, price: 799900, stock: 18, hsn: '84716060' },
    { name: 'Epson EcoTank L3250 Printer', sku: 'EPS-L3250', barcode: '871594668245', cat: 'Office Tech', brand: 'Epson', cost: 950000, price: 1350000, stock: 0, hsn: '84433100' }
  ];

  for(const p of extraProducts) {
    let cat = (await db.select().from(categories).where(eq(categories.name, p.cat)))[0];
    if(!cat) cat = (await db.insert(categories).values({ name: p.cat, slug: p.cat.toLowerCase().replace(/ /g, '-'), description: p.cat }).returning())[0];

    let brand = (await db.select().from(brands).where(eq(brands.name, p.brand)))[0];
    if(!brand) brand = (await db.insert(brands).values({ name: p.brand, slug: p.brand.toLowerCase().replace(/ /g, '-'), description: p.brand }).returning())[0];

    let prod = (await db.select().from(products).where(eq(products.sku, p.sku)))[0];
    if(prod) {
      await db.update(products).set({
        categoryId: cat.id,
        brandId: brand.id,
        taxId: gst18?.id,
        hsnCode: p.hsn,
      }).where(eq(products.sku, p.sku));

      const inv = await db.select().from(inventoryItems).where(eq(inventoryItems.productId, prod.id));
      if(inv.length === 0 && wh && p.stock > 0) {
        await db.insert(inventoryItems).values({
          productId: prod.id,
          warehouseId: wh.id,
          binLocation: 'EXTRA',
          batchNumber: 'EXT',
          quantityAvailable: p.stock,
          quantityAllocated: 0,
          reorderPoint: 5,
          safetyStock: 2,
        });
      }
    }
  }
  
  // Fix any remaining products (like New Item)
  const remaining = await db.select().from(products).where(isNull(products.taxId));
  for(const r of remaining) {
      await db.update(products).set({
          taxId: gst18?.id
      }).where(eq(products.id, r.id));
  }

  console.log('Fixed products.');
}
main().then(() => pool.end());

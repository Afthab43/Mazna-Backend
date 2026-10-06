import { db, pool } from '../config/db';
import { products, categories, brands, taxes, inventoryItems } from './schema';
import { eq } from 'drizzle-orm';
async function main() {
  const list = await db
    .select({
      name: products.name,
      taxRate: taxes.rate,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(taxes, eq(products.taxId, taxes.id))
    .leftJoin(inventoryItems, eq(products.id, inventoryItems.productId));
  console.log(list);
}
main().then(() => pool.end());

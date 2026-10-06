import { db, pool } from '../config/db';
import {
  taxes,
  permissions,
  roles,
  rolePermissions,
  departments,
  users,
  warehouses,
  companySettings,
  categories,
  brands,
  suppliers,
  products,
  inventoryItems,
  purchaseOrders,
  purchaseOrderItems,
  sidebarConfigurations,
} from './schema';
import { DEFAULT_SIDEBAR_CONFIG } from '../controllers/navigationController';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

const DEFAULT_PERMISSIONS = [
  // Catalog
  { key: 'products.view', module: 'catalog', action: 'view', description: 'View products catalog' },
  { key: 'products.create', module: 'catalog', action: 'create', description: 'Create new product' },
  { key: 'products.update', module: 'catalog', action: 'update', description: 'Update existing product' },
  { key: 'products.delete', module: 'catalog', action: 'delete', description: 'Archive/delete product' },
  { key: 'categories.manage', module: 'catalog', action: 'manage', description: 'Manage categories' },
  { key: 'brands.manage', module: 'catalog', action: 'manage', description: 'Manage brands' },

  // Inventory
  { key: 'inventory.view', module: 'inventory', action: 'view', description: 'View warehouse inventory' },
  { key: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Perform manual stock adjustments' },
  { key: 'inventory.transfer', module: 'inventory', action: 'transfer', description: 'Transfer stock between warehouses' },
  { key: 'stock_movements.view', module: 'inventory', action: 'view', description: 'View stock movement audit logs' },
  { key: 'low_stock.view', module: 'inventory', action: 'view', description: 'View low stock alerts' },
  { key: 'warehouses.manage', module: 'inventory', action: 'manage', description: 'Manage warehouses' },

  // Purchasing
  { key: 'purchase.view', module: 'purchasing', action: 'view', description: 'View purchase orders' },
  { key: 'purchase.create', module: 'purchasing', action: 'create', description: 'Create purchase order' },
  { key: 'purchase.edit', module: 'purchasing', action: 'edit', description: 'Edit purchase order' },
  { key: 'purchase.approve', module: 'purchasing', action: 'approve', description: 'Approve purchase orders' },
  { key: 'purchase.cancel', module: 'purchasing', action: 'cancel', description: 'Cancel purchase orders' },
  { key: 'goods_received.create', module: 'purchasing', action: 'create', description: 'Receive goods against PO' },
  { key: 'suppliers.manage', module: 'purchasing', action: 'manage', description: 'Manage supplier master data' },

  // Sales & Orders
  { key: 'sales.view', module: 'sales', action: 'view', description: 'View sales orders' },
  { key: 'sales.create', module: 'sales', action: 'create', description: 'Create sales orders' },
  { key: 'sales.confirm', module: 'sales', action: 'confirm', description: 'Confirm sales orders' },
  { key: 'sales.ship', module: 'sales', action: 'ship', description: 'Dispatch/ship sales orders' },
  { key: 'sales.cancel', module: 'sales', action: 'cancel', description: 'Cancel sales orders' },
  { key: 'customers.view', module: 'sales', action: 'view', description: 'View customer accounts' },

  // Billing & Finance
  { key: 'invoices.view', module: 'billing', action: 'view', description: 'View and download invoices' },
  { key: 'invoices.create', module: 'billing', action: 'create', description: 'Generate GST invoices' },
  { key: 'payments.process', module: 'billing', action: 'process', description: 'Process payments and refunds' },
  { key: 'financials.view', module: 'billing', action: 'view', description: 'View revenue, profit, and margin widgets' },

  // Fulfillment & Delivery
  { key: 'deliveries.manage', module: 'fulfillment', action: 'manage', description: 'Manage dispatches and tracking' },
  { key: 'returns.approve', module: 'fulfillment', action: 'approve', description: 'Approve customer returns' },

  // System Administration
  { key: 'employees.manage', module: 'system', action: 'manage', description: 'Manage employee accounts' },
  { key: 'roles.manage', module: 'system', action: 'manage', description: 'Manage roles and permissions' },
  { key: 'sessions.revoke', module: 'system', action: 'revoke', description: 'Revoke active user sessions' },
  { key: 'settings.update', module: 'system', action: 'update', description: 'Update company settings' },
  { key: 'audit_logs.view', module: 'system', action: 'view', description: 'View immutable audit log trail' },
];

async function main() {
  console.log('🌱 Starting MAZNA ENTERPRISES Drizzle ORM database seeding...');

  // 1. Seed Tax Master
  const defaultTaxes = [
    { name: 'GST 0%', rate: 0.0, isDefault: false },
    { name: 'GST 5%', rate: 5.0, isDefault: false },
    { name: 'GST 12%', rate: 12.0, isDefault: false },
    { name: 'GST 18%', rate: 18.0, isDefault: true },
    { name: 'GST 28%', rate: 28.0, isDefault: false },
  ];

  const createdTaxes: Record<string, string> = {};
  for (const tax of defaultTaxes) {
    let existing = (await db.select().from(taxes).where(eq(taxes.name, tax.name)))[0];
    if (!existing) {
      const inserted = await db.insert(taxes).values(tax).returning();
      existing = inserted[0];
    }
    createdTaxes[tax.name] = existing.id;
  }
  console.log('✅ Tax Master categories seeded.');

  // 2. Seed Permissions
  for (const perm of DEFAULT_PERMISSIONS) {
    const existing = await db.select().from(permissions).where(eq(permissions.key, perm.key));
    if (existing.length === 0) {
      await db.insert(permissions).values(perm);
    }
  }
  console.log(`✅ ${DEFAULT_PERMISSIONS.length} Permissions seeded.`);

  // 3. Seed Roles
  const rolesToCreate = [
    { name: 'Admin', description: 'System Administrator with unrestricted access', isSystem: true },
    { name: 'Subadmin', description: 'Operations Subadmin with full management access excluding system settings', isSystem: true },
    { name: 'Warehouse Manager', description: 'Manages inventory transfers, stock counts, and dispatches', isSystem: true },
    { name: 'Procurement Specialist', description: 'Creates and manages purchase orders and supplier relations', isSystem: true },
    { name: 'Employee', description: 'Standard employee with view and standard operation access', isSystem: true },
  ];

  const createdRoles: Record<string, string> = {};
  for (const r of rolesToCreate) {
    let existing = (await db.select().from(roles).where(eq(roles.name, r.name)))[0];
    if (!existing) {
      const inserted = await db.insert(roles).values(r).returning();
      existing = inserted[0];
    }
    createdRoles[r.name] = existing.id;
  }

  // Map all permissions to Admin & Subadmin role
  const allPermissions = await db.select().from(permissions);
  for (const perm of allPermissions) {
    const existingMap = await db.select().from(rolePermissions).where(
      eq(rolePermissions.roleId, createdRoles['Admin'])
    );
    if (!existingMap.some((m) => m.permissionId === perm.id)) {
      await db.insert(rolePermissions).values({
        roleId: createdRoles['Admin'],
        permissionId: perm.id,
      });
    }
  }
  console.log('✅ Roles & Permissions mapped.');

  // 4. Seed Departments
  const defaultDepts = [
    { name: 'Management', code: 'MGMT', description: 'Executive & General Management' },
    { name: 'Inventory & Warehouse', code: 'INV', description: 'Stock & Warehouse Operations' },
    { name: 'Procurement', code: 'PROC', description: 'Purchasing & Vendor Management' },
    { name: 'Sales & Marketing', code: 'SALES', description: 'Storefront & B2B Sales' },
    { name: 'Finance & Billing', code: 'FIN', description: 'Invoicing & Accounts' },
  ];

  const createdDepts: Record<string, string> = {};
  for (const dept of defaultDepts) {
    let existing = (await db.select().from(departments).where(eq(departments.code, dept.code)))[0];
    if (!existing) {
      const inserted = await db.insert(departments).values(dept).returning();
      existing = inserted[0];
    }
    createdDepts[dept.code] = existing.id;
  }
  console.log('✅ Departments seeded.');

  // 5. Seed Users
  const defaultUsers = [
    {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@mazna.com',
      phone: '+919876543210',
      password: 'AdminPass123!',
      accountType: 'ADMIN' as const,
      roleId: createdRoles['Admin'],
      employeeId: 'EMP-001',
      designation: 'Chief Administrator',
      departmentId: createdDepts['MGMT'],
    },
    {
      firstName: 'Operations',
      lastName: 'Subadmin',
      email: 'subadmin@mazna.com',
      phone: '+919876543211',
      password: 'SubadminPass123!',
      accountType: 'SUBADMIN' as const,
      roleId: createdRoles['Subadmin'],
      employeeId: 'EMP-002',
      designation: 'Senior Operations Manager',
      departmentId: createdDepts['INV'],
    },
    {
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'employee@mazna.com',
      phone: '+919876543212',
      password: 'EmployeePass123!',
      accountType: 'EMPLOYEE' as const,
      roleId: createdRoles['Employee'],
      employeeId: 'EMP-003',
      designation: 'Inventory Coordinator',
      departmentId: createdDepts['INV'],
    },
    {
      firstName: 'Vikram',
      lastName: 'Enterprises',
      email: 'customer@mazna.com',
      phone: '+919876543213',
      password: 'CustomerPass123!',
      accountType: 'USER' as const,
      gstNumber: '29AAACV1234F1Z5',
      designation: 'B2B Procurement Officer',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email));
    if (existing.length === 0) {
      const passwordHash = await argon2.hash(u.password);
      await db.insert(users).values({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        passwordHash,
        accountType: u.accountType,
        roleId: u.roleId || null,
        employeeId: u.employeeId || null,
        designation: u.designation || null,
        departmentId: u.departmentId || null,
        gstNumber: u.gstNumber || null,
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
      });
      console.log(`👤 User created: ${u.email} (${u.accountType})`);
    }
  }

  // 6. Seed Warehouses
  const warehouseList = [
    { name: 'Central Bangalore Warehouse', code: 'WH-BLR-01', address: 'Plot 45, Electronics City Phase 1', city: 'Bangalore', state: 'Karnataka', pincode: '560100', isFulfilment: true },
    { name: 'Mumbai Distribution Hub', code: 'WH-BOM-01', address: 'Building 12, Bhiwandi Logistics Park', city: 'Mumbai', state: 'Maharashtra', pincode: '421302', isFulfilment: false },
    { name: 'Delhi NCR Fulfillment Center', code: 'WH-DEL-01', address: 'Warehouse 9, Okhla Industrial Area', city: 'New Delhi', state: 'Delhi', pincode: '110020', isFulfilment: false },
  ];

  const createdWarehouses: Record<string, string> = {};
  for (const wh of warehouseList) {
    let existing = (await db.select().from(warehouses).where(eq(warehouses.code, wh.code)))[0];
    if (!existing) {
      const inserted = await db.insert(warehouses).values(wh).returning();
      existing = inserted[0];
    }
    createdWarehouses[wh.code] = existing.id;
  }
  console.log('🏢 Warehouses seeded.');

  // 7. Seed Company Settings
  const existingSettings = await db.select().from(companySettings);
  if (existingSettings.length === 0) {
    await db.insert(companySettings).values({
      companyName: 'MAZNA ENTERPRISES',
      address: '123 Business Hub, MG Road, Bangalore, Karnataka',
      state: 'Karnataka',
      email: 'contact@mazna.com',
      phone: '+918022334455',
      gstin: '29ABCDE1234F1ZH',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxInclusivePricing: true,
      onlineFulfilmentWarehouseId: createdWarehouses['WH-BLR-01'],
      reservationExpiryMinutes: 15,
      returnWindowDays: 7,
      poApprovalThresholdPaise: BigInt(5000000), // ₹50,000 threshold
      overReceiptTolerancePercentage: 0.0,
    });
    console.log('⚙️ Default Company Settings seeded.');
  }

  // 7b. Seed Default Sidebar Navigation Configuration
  const existingSidebar = await db.select().from(sidebarConfigurations).where(eq(sidebarConfigurations.roleKey, 'DEFAULT'));
  if (existingSidebar.length === 0) {
    await db.insert(sidebarConfigurations).values({
      roleKey: 'DEFAULT',
      config: DEFAULT_SIDEBAR_CONFIG,
      allowNonAdminCustomization: false,
    });
    console.log('🗺️ Default Sidebar Layout & Permissions Configuration seeded.');
  }

  // 8. Seed Categories & Brands
  const categoryList = [
    { name: 'Peripherals', slug: 'peripherals', description: 'Computer mice, keyboards, and input devices' },
    { name: 'Office Tech', slug: 'office-tech', description: 'Office hardware and productivity equipment' },
    { name: 'Heavy Fasteners & Bolts', slug: 'heavy-fasteners-bolts', description: 'High tensile industrial bolts, nuts, and studs' },
    { name: 'Safety Equipment & PPE', slug: 'safety-equipment-ppe', description: 'Protective footwear, helmets, and safety gear' },
    { name: 'Power Tools & Machinery', slug: 'power-tools-machinery', description: 'Professional heavy-duty power tools and drills' },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categoryList) {
    let existing = (await db.select().from(categories).where(eq(categories.slug, cat.slug)))[0];
    if (!existing) {
      const inserted = await db.insert(categories).values(cat).returning();
      existing = inserted[0];
    }
    createdCategories[cat.slug] = existing.id;
  }

  const brandList = [
    { name: 'Logitech', slug: 'logitech', description: 'Performance series input devices' },
    { name: 'Dell', slug: 'dell', description: 'Office standard computing hardware' },
    { name: 'Mazna Pro', slug: 'mazna-pro', description: 'Precision engineered industrial hardware' },
    { name: 'Bosch Industrial', slug: 'bosch-industrial', description: 'German engineered power tools and accessories' },
    { name: '3M Safety', slug: '3m-safety', description: 'World leading personal protective equipment' },
  ];

  const createdBrands: Record<string, string> = {};
  for (const b of brandList) {
    let existing = (await db.select().from(brands).where(eq(brands.slug, b.slug)))[0];
    if (!existing) {
      const inserted = await db.insert(brands).values(b).returning();
      existing = inserted[0];
    }
    createdBrands[b.slug] = existing.id;
  }

  // 9. Seed Suppliers
  const supplierList = [
    { name: 'Apex Fastener Industries', code: 'SUP-APEX-01', contactPerson: 'Anand Kumar', email: 'orders@apexfasteners.com', phone: '+919811223344', gstin: '27AAACA1234B1Z2', rating: 4.8 },
    { name: 'Titan Tools & Equipment Co.', code: 'SUP-TITAN-01', contactPerson: 'Priya Verma', email: 'sales@titantools.in', phone: '+919822334455', gstin: '29AAACT9876C1Z9', rating: 4.9 },
  ];

  const createdSuppliers: Record<string, string> = {};
  for (const sup of supplierList) {
    let existing = (await db.select().from(suppliers).where(eq(suppliers.code, sup.code)))[0];
    if (!existing) {
      const inserted = await db.insert(suppliers).values(sup).returning();
      existing = inserted[0];
    }
    createdSuppliers[sup.code] = existing.id;
  }

  // 10. Seed Products & Inventory Items
  const productList = [
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      sku: 'LOG-MX3-BLK',
      barcode: '890123456789',
      categoryId: createdCategories['peripherals'],
      brandId: createdBrands['logitech'],
      taxId: createdTaxes['GST 18%'],
      unit: 'PCS',
      costPricePaise: BigInt(620000), // ₹6,200.00
      mrpPaise: BigInt(899900), // ₹8,999.00
      sellingPricePaise: BigInt(899900), // ₹8,999.00
      b2bPricePaise: BigInt(749900), // ₹7,499.00
      b2bMinQty: 10,
      description: 'Ergonomic wireless performance mouse with Quiet Clicks, 8K DPI track-on-glass sensor',
    },
    {
      name: 'Dell Pro Wireless Keyboard KB500',
      sku: 'DEL-KB-500',
      barcode: '890123456790',
      categoryId: createdCategories['office-tech'],
      brandId: createdBrands['dell'],
      taxId: createdTaxes['GST 18%'],
      unit: 'PCS',
      costPricePaise: BigInt(100000), // ₹1,000.00
      mrpPaise: BigInt(145000), // ₹1,450.00
      sellingPricePaise: BigInt(145000), // ₹1,450.00
      b2bPricePaise: BigInt(120000),
      b2bMinQty: 5,
      description: 'Full sized wireless keyboard with programmable hotkeys and long battery life',
    },
    {
      name: 'Galvanized Hex Bolt M12 x 50mm',
      sku: 'MZN-BOLT-M12-50',
      barcode: '8901234567890',
      categoryId: createdCategories['heavy-fasteners-bolts'],
      brandId: createdBrands['mazna-pro'],
      taxId: createdTaxes['GST 18%'],
      unit: 'BOX',
      costPricePaise: BigInt(45000), // ₹450.00
      mrpPaise: BigInt(75000), // ₹750.00
      sellingPricePaise: BigInt(65000), // ₹650.00
      b2bPricePaise: BigInt(55000), // ₹550.00
      b2bMinQty: 10,
      description: 'High strength Grade 8.8 galvanized hexagon head bolts (Pack of 50)',
    },
    {
      name: 'Industrial Steel Toe Safety Boot Size 42',
      sku: 'MZN-BOOT-IND-42',
      barcode: '8901234567891',
      categoryId: createdCategories['safety-equipment-ppe'],
      brandId: createdBrands['3m-safety'],
      taxId: createdTaxes['GST 18%'],
      unit: 'PAIR',
      costPricePaise: BigInt(120000), // ₹1,200.00
      mrpPaise: BigInt(249900), // ₹2,499.00
      sellingPricePaise: BigInt(189900), // ₹1,899.00
      b2bPricePaise: BigInt(159900), // ₹1,599.00
      b2bMinQty: 5,
      description: 'Anti-skid oil resistant steel toe safety work boots with Kevlar sole',
    },
    {
      name: 'Cordless SDS Plus Rotary Hammer Drill 20V',
      sku: 'MZN-DRIL-RH20V',
      barcode: '8901234567892',
      categoryId: createdCategories['power-tools-machinery'],
      brandId: createdBrands['bosch-industrial'],
      taxId: createdTaxes['GST 18%'],
      unit: 'PCS',
      costPricePaise: BigInt(650000), // ₹6,500.00
      mrpPaise: BigInt(1299900), // ₹12,999.00
      sellingPricePaise: BigInt(949900), // ₹9,499.00
      b2bPricePaise: BigInt(849900), // ₹8,499.00
      b2bMinQty: 2,
      description: 'Brushless motor 2.0J impact energy heavy concrete drill kit with 2x 4.0Ah batteries',
    },
  ];

  for (const p of productList) {
    let existingProd = (await db.select().from(products).where(eq(products.sku, p.sku)))[0];
    if (!existingProd) {
      const inserted = await db.insert(products).values(p).returning();
      existingProd = inserted[0];

      // Add inventory for WH-BLR-01
      await db.insert(inventoryItems).values({
        productId: existingProd.id,
        warehouseId: createdWarehouses['WH-BLR-01'],
        binLocation: 'A1-R04-B02',
        batchNumber: 'BATCH-2026-09',
        quantityAvailable: 34,
        quantityAllocated: 5,
        reorderPoint: 15,
        safetyStock: 10,
      });
    }
  }
  console.log('📦 Products & Inventory items seeded.');

  console.log('🎉 Drizzle ORM Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during Drizzle database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

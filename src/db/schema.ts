import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['ADMIN', 'SUBADMIN', 'EMPLOYEE', 'USER']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']);

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  passwordHash: text('password_hash').notNull(),
  accountType: accountTypeEnum('account_type').default('USER').notNull(),
  roleId: text('role_id'),
  employeeId: varchar('employee_id', { length: 50 }).unique(),
  departmentId: text('department_id'),
  designation: varchar('designation', { length: 100 }),
  profileImage: text('profile_image'),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  passwordChangedAt: timestamp('password_changed_at', { mode: 'date' }),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockUntil: timestamp('lock_until', { mode: 'date' }),
  gstNumber: varchar('gst_number', { length: 20 }),
  consentAcceptedAt: timestamp('consent_accepted_at', { mode: 'date' }),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  lastLogoutAt: timestamp('last_logout_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

// Sessions Table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  browser: varchar('browser', { length: 100 }),
  device: varchar('device', { length: 100 }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Roles Table
export const roles = pgTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Permissions Table
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar('key', { length: 100 }).unique().notNull(), // e.g. "inventory.adjust"
  module: varchar('module', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Role Permissions Junction Table
export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

// Departments Table
export const departments = pgTable('departments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).unique().notNull(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Warehouses Table
export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).unique().notNull(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  address: text('address'),
  city: varchar('city', { length: 50 }),
  state: varchar('state', { length: 50 }),
  pincode: varchar('pincode', { length: 10 }),
  isFulfilment: boolean('is_fulfilment').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// User Warehouses Junction Table
export const userWarehouses = pgTable('user_warehouses', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.warehouseId] }),
}));

// Categories Table
export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  description: text('description'),
  parentId: text('parent_id'),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Brands Table
export const brands = pgTable('brands', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  logo: text('logo'),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Taxes Table
export const taxes = pgTable('taxes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 50 }).unique().notNull(),
  rate: doublePrecision('rate').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Suppliers Table
export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  gstin: varchar('gstin', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  rating: doublePrecision('rating').default(5.0),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Products Table
export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  barcode: varchar('barcode', { length: 100 }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  hsnCode: varchar('hsn_code', { length: 20 }),
  taxId: text('tax_id').references(() => taxes.id, { onDelete: 'set null' }),
  unit: varchar('unit', { length: 20 }).default('PCS').notNull(),
  costPricePaise: bigint('cost_price_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  mrpPaise: bigint('mrp_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  sellingPricePaise: bigint('selling_price_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  b2bPricePaise: bigint('b2b_price_paise', { mode: 'bigint' }),
  b2bMinQty: integer('b2b_min_qty').default(1),
  images: jsonb('images').$type<Array<{ id: string; url: string; name: string; size: string; isPrimary: boolean; storagePath: string }>>().default([]),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Inventory Items Table
export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  binLocation: varchar('bin_location', { length: 50 }),
  batchNumber: varchar('batch_number', { length: 100 }),
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityAllocated: integer('quantity_allocated').default(0).notNull(),
  reorderPoint: integer('reorder_point').default(10).notNull(),
  safetyStock: integer('safety_stock').default(5).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Purchase Orders Table
export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poNumber: varchar('po_number', { length: 50 }).unique().notNull(),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  destinationWarehouseId: text('destination_warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  orderDate: timestamp('order_date', { mode: 'date' }).defaultNow().notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date', { mode: 'date' }),
  paymentTerms: varchar('payment_terms', { length: 50 }).default('NET_30'),
  status: varchar('status', { length: 50 }).default('DRAFT').notNull(),
  subtotalPaise: bigint('subtotal_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  taxPaise: bigint('tax_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  totalPaise: bigint('total_paise', { mode: 'bigint' }).default(sql`0`).notNull(),
  notes: text('notes'),
  createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Purchase Order Items Table
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poId: text('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  orderedQty: integer('ordered_qty').notNull(),
  receivedQty: integer('received_qty').default(0).notNull(),
  unitPricePaise: bigint('unit_price_paise', { mode: 'bigint' }).notNull(),
  taxRate: doublePrecision('tax_rate').default(18.0).notNull(),
  totalPaise: bigint('total_paise', { mode: 'bigint' }).notNull(),
});

// Sequence Counters Table
export const sequenceCounters = pgTable('sequence_counters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar('key', { length: 50 }).unique().notNull(),
  sequence: integer('sequence').default(0).notNull(),
  financialYear: varchar('financial_year', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Company Settings Table
export const companySettings = pgTable('company_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyName: varchar('company_name', { length: 100 }).notNull(),
  logoUrl: text('logo_url'),
  address: text('address'),
  state: varchar('state', { length: 50 }),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  gstin: varchar('gstin', { length: 20 }),
  currency: varchar('currency', { length: 10 }).default('INR').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata').notNull(),
  taxInclusivePricing: boolean('tax_inclusive_pricing').default(true).notNull(),
  onlineFulfilmentWarehouseId: text('online_fulfilment_warehouse_id'),
  reservationExpiryMinutes: integer('reservation_expiry_minutes').default(15).notNull(),
  returnWindowDays: integer('return_window_days').default(7).notNull(),
  poApprovalThresholdPaise: bigint('po_approval_threshold_paise', { mode: 'bigint' }).default(sql`5000000`).notNull(),
  overReceiptTolerancePercentage: doublePrecision('over_receipt_tolerance_percentage').default(0.0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  targetTable: varchar('target_table', { length: 50 }).notNull(),
  targetId: text('target_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Sidebar Configurations Table
export const sidebarConfigurations = pgTable('sidebar_configurations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roleKey: varchar('role_key', { length: 50 }).default('DEFAULT').notNull(),
  config: jsonb('config').notNull(),
  allowNonAdminCustomization: boolean('allow_non_admin_customization').default(false).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});


// Relations Definitions
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  sessions: many(sessions),
  warehouseAccess: many(userWarehouses),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  tax: one(taxes, { fields: [products.taxId], references: [taxes.id] }),
  inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  product: one(products, { fields: [inventoryItems.productId], references: [products.id] }),
  warehouse: one(warehouses, { fields: [inventoryItems.warehouseId], references: [warehouses.id] }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  warehouse: one(warehouses, { fields: [purchaseOrders.destinationWarehouseId], references: [warehouses.id] }),
  createdUser: one(users, { fields: [purchaseOrders.createdById], references: [users.id] }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.poId], references: [purchaseOrders.id] }),
  product: one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
}));

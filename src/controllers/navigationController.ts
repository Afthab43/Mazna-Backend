import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { sidebarConfigurations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError } from '../helpers/appError';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const DEFAULT_SIDEBAR_CONFIG = [
  {
    id: 'group_main',
    title: 'MAIN',
    defaultOpen: true,
    items: [
      { id: 'item_dashboard', title: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' }
    ]
  },
  {
    id: 'group_catalog',
    title: 'CATALOG',
    defaultOpen: true,
    items: [
      { id: 'item_products', title: 'Products', href: '/admin/catalog/products', icon: 'Package', permissionKey: 'products.view' },
      { id: 'item_categories', title: 'Categories', href: '/admin/catalog/categories', icon: 'Grid', permissionKey: 'categories.manage' },
      { id: 'item_brands', title: 'Brands', href: '/admin/catalog/brands', icon: 'Bookmark', permissionKey: 'brands.manage' }
    ]
  },
  {
    id: 'group_inventory',
    title: 'INVENTORY',
    defaultOpen: true,
    items: [
      { id: 'item_inventory', title: 'Inventory', href: '/admin/inventory/overview', icon: 'Boxes', permissionKey: 'inventory.view' },
      { id: 'item_movements', title: 'Stock Movements', href: '/admin/inventory/movements', icon: 'Activity', permissionKey: 'stock_movements.view' },
      { id: 'item_low_stocks', title: 'Low Stocks', href: '/admin/inventory/low-stocks', icon: 'AlertTriangle', permissionKey: 'low_stock.view', badgeKey: 'lowStockCount' },
      { id: 'item_adjustments', title: 'Stock Adjustments', href: '/admin/inventory/adjustments', icon: 'Sliders', permissionKey: 'inventory.adjust' }
    ]
  },
  {
    id: 'group_sales',
    title: 'SALES',
    defaultOpen: true,
    items: [
      { id: 'item_sales_orders', title: 'Sales Order', href: '/admin/sales/orders', icon: 'ShoppingCart', permissionKey: 'sales.view' },
      { id: 'item_returns', title: 'Returns', href: '/admin/sales/returns', icon: 'RotateCcw', permissionKey: 'returns.approve' },
      { id: 'item_refunds', title: 'Refunds', href: '/admin/sales/refunds', icon: 'Receipt', permissionKey: 'payments.process' }
    ]
  },
  {
    id: 'group_purchases',
    title: 'PURCHASES',
    defaultOpen: true,
    items: [
      { id: 'item_pos', title: 'Purchase Orders', href: '/admin/purchasing/purchase-orders', icon: 'FileText', permissionKey: 'purchase.view', badgeKey: 'pendingPoCount' },
      { id: 'item_grn', title: 'Goods Received', href: '/admin/purchasing/goods-received', icon: 'Truck', permissionKey: 'goods_received.create' },
      { id: 'item_suppliers', title: 'Suppliers', href: '/admin/purchasing/suppliers', icon: 'Users', permissionKey: 'suppliers.manage' }
    ]
  },
  {
    id: 'group_customers',
    title: 'CUSTOMERS',
    defaultOpen: true,
    items: [
      { id: 'item_customers', title: 'Customers', href: '/admin/sales/customers', icon: 'UserCheck', permissionKey: 'customers.view' }
    ]
  },
  {
    id: 'group_billing',
    title: 'BILLING',
    defaultOpen: true,
    items: [
      { id: 'item_invoices', title: 'Invoices', href: '/admin/billing/invoices', icon: 'FileCheck', permissionKey: 'invoices.view' },
      { id: 'item_payments', title: 'Payments', href: '/admin/billing/payments', icon: 'CreditCard', permissionKey: 'payments.process' }
    ]
  },
  {
    id: 'group_system',
    title: 'SYSTEM',
    defaultOpen: false,
    items: [
      { id: 'item_employees', title: 'Employees', href: '/admin/system/employees', icon: 'UserCog', permissionKey: 'employees.manage' },
      { id: 'item_roles', title: 'Roles & Permissions', href: '/admin/system/roles', icon: 'ShieldCheck', permissionKey: 'roles.manage' },
      { id: 'item_settings', title: 'Settings', href: '/admin/system/settings', icon: 'Settings', permissionKey: 'settings.update' },
      { id: 'item_audit_logs', title: 'Audit Logs', href: '/admin/system/audit-logs', icon: 'History', permissionKey: 'audit_logs.view' }
    ]
  }
];

export class NavigationController {
  public static async getNavigationConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await db.select().from(sidebarConfigurations).where(eq(sidebarConfigurations.roleKey, 'DEFAULT'));
      
      const rawGroups = records.length > 0 ? (records[0].config as any[]) : DEFAULT_SIDEBAR_CONFIG;
      const allowCustomization = records.length > 0 ? records[0].allowNonAdminCustomization : false;

      const user = req.user;
      const isEditMode = req.query.mode === 'edit';

      // If requesting user is ADMIN or in edit mode, return raw full navigation config
      if (!user || user.accountType === 'ADMIN' || isEditMode) {
        res.status(200).json({
          success: true,
          code: 'OK',
          data: {
            groups: rawGroups,
            allowNonAdminCustomization: allowCustomization,
          },
        });
        return;
      }

      // For non-Admin users (SUBADMIN, EMPLOYEE, USER, or specific roles), filter sidebar groups & items in backend
      const userAccountType = (user.accountType || '').toUpperCase();
      const userRoleName = (user.roleName || '').toUpperCase();
      const userRoleId = user.roleId || '';
      const userPermissions = user.permissions || [];

      const filteredGroups = rawGroups
        .map((group) => {
          // Check if group is hidden for this role
          const isGroupHidden = (group.hiddenRoles || []).some((r: string) => {
            const upper = r.toUpperCase();
            return upper === userAccountType || upper === userRoleName || r === userRoleId;
          });

          if (isGroupHidden) return null;

          // Filter group items
          const visibleItems = (group.items || []).filter((item: any) => {
            // Check hiddenRoles
            const isItemHidden = (item.hiddenRoles || []).some((r: string) => {
              const upper = r.toUpperCase();
              return upper === userAccountType || upper === userRoleName || r === userRoleId;
            });

            if (isItemHidden) return false;

            // Check permissionKey
            if (item.permissionKey && !userPermissions.includes(item.permissionKey)) {
              return false;
            }

            return true;
          });

          if (visibleItems.length === 0) return null;

          return {
            ...group,
            items: visibleItems,
          };
        })
        .filter(Boolean);

      res.status(200).json({
        success: true,
        code: 'OK',
        data: {
          groups: filteredGroups,
          allowNonAdminCustomization: allowCustomization,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async saveNavigationConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groups, allowNonAdminCustomization } = req.body;

      if (!Array.isArray(groups)) {
        throw new BadRequestError('groups must be an array of SidebarGroupConfig objects');
      }

      const existing = await db.select().from(sidebarConfigurations).where(eq(sidebarConfigurations.roleKey, 'DEFAULT'));

      if (existing.length === 0) {
        await db.insert(sidebarConfigurations).values({
          roleKey: 'DEFAULT',
          config: groups,
          allowNonAdminCustomization: allowNonAdminCustomization ?? false,
        });
      } else {
        await db
          .update(sidebarConfigurations)
          .set({
            config: groups,
            allowNonAdminCustomization: allowNonAdminCustomization ?? existing[0].allowNonAdminCustomization,
            updatedAt: new Date(),
          })
          .where(eq(sidebarConfigurations.id, existing[0].id));
      }

      res.status(200).json({
        success: true,
        code: 'NAVIGATION_SAVED',
        message: 'Sidebar navigation layout & role permissions saved to database',
        data: {
          groups,
          allowNonAdminCustomization: allowNonAdminCustomization ?? false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resetNavigationConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await db.select().from(sidebarConfigurations).where(eq(sidebarConfigurations.roleKey, 'DEFAULT'));

      if (existing.length > 0) {
        await db
          .update(sidebarConfigurations)
          .set({
            config: DEFAULT_SIDEBAR_CONFIG,
            allowNonAdminCustomization: false,
            updatedAt: new Date(),
          })
          .where(eq(sidebarConfigurations.id, existing[0].id));
      }

      res.status(200).json({
        success: true,
        code: 'NAVIGATION_RESET',
        message: 'Sidebar layout reset to factory default in database',
        data: {
          groups: DEFAULT_SIDEBAR_CONFIG,
          allowNonAdminCustomization: false,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

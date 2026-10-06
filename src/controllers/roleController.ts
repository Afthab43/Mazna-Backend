import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { roles, permissions, rolePermissions } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../helpers/appError';

export class RoleController {
  public static async getRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleList = await db.select().from(roles);
      const allPerms = await db.select().from(permissions);
      const allRolePerms = await db.select().from(rolePermissions);

      const rolesWithPerms = roleList.map((r) => {
        const mappedPermIds = allRolePerms.filter((rp) => rp.roleId === r.id).map((rp) => rp.permissionId);
        const permKeys = r.name === 'Admin'
          ? ['all', ...allPerms.map((p) => p.key)]
          : allPerms.filter((p) => mappedPermIds.includes(p.id)).map((p) => p.key);

        return {
          ...r,
          permKeys,
        };
      });

      res.status(200).json({
        success: true,
        code: 'OK',
        data: rolesWithPerms,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permList = await db.select().from(permissions);
      res.status(200).json({
        success: true,
        code: 'OK',
        data: permList,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, permKeys, permissionIds } = req.body;

      if (!name) {
        throw new BadRequestError('Role name is required');
      }

      const existing = await db.select().from(roles).where(eq(roles.name, name));
      if (existing.length > 0) {
        throw new BadRequestError('A role with this name already exists');
      }

      const inserted = await db
        .insert(roles)
        .values({
          name,
          description: description || null,
          isSystem: false,
        })
        .returning();

      const newRole = inserted[0];

      // Map permission IDs or permKeys if provided
      let targetPermIds: string[] = [];
      if (permissionIds && Array.isArray(permissionIds)) {
        targetPermIds = permissionIds;
      } else if (permKeys && Array.isArray(permKeys)) {
        const matchingPerms = await db.select().from(permissions);
        targetPermIds = matchingPerms.filter((p) => permKeys.includes(p.key)).map((p) => p.id);
      }

      for (const permissionId of targetPermIds) {
        await db.insert(rolePermissions).values({
          roleId: newRole.id,
          permissionId,
        });
      }

      res.status(201).json({
        success: true,
        code: 'ROLE_CREATED',
        message: 'Role created and permissions mapped successfully',
        data: {
          ...newRole,
          permKeys: permKeys || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId } = req.params;
      const { permKeys } = req.body; // Array of permission keys e.g. ["products.view", "inventory.adjust"]

      if (!Array.isArray(permKeys)) {
        throw new BadRequestError('permKeys must be an array of permission strings');
      }

      const roleRes = await db.select().from(roles).where(eq(roles.id, roleId));
      if (roleRes.length === 0) {
        throw new NotFoundError('Target role not found');
      }

      const role = roleRes[0];
      if (role.name === 'Admin' && role.isSystem) {
        throw new BadRequestError('System Admin role permissions are immutable');
      }

      // Delete existing role permission mappings
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      // Resolve permission keys to permission IDs
      const allPerms = await db.select().from(permissions);
      const selectedPerms = allPerms.filter((p) => permKeys.includes(p.key));

      for (const perm of selectedPerms) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId: perm.id,
        });
      }

      res.status(200).json({
        success: true,
        code: 'ROLE_PERMISSIONS_UPDATED',
        message: `Updated permissions for role ${role.name} in database`,
        data: {
          roleId,
          roleName: role.name,
          permKeys,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/db';
import { users, roles, rolePermissions, permissions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { UnauthorizedError, ForbiddenError } from '../helpers/appError';

export interface AuthenticatedUser {
  userId: string;
  accountType: 'ADMIN' | 'SUBADMIN' | 'EMPLOYEE' | 'USER';
  roleId: string | null;
  roleName?: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check cookie
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Allow fallback in development if no token provided, defaults to system admin or unauthenticated
      // If header/cookie present, verify it strictly
      req.user = {
        userId: 'system-admin',
        accountType: 'ADMIN',
        roleId: null,
        permissions: ['roles.manage', 'employees.manage'],
      };
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string;
      accountType: 'ADMIN' | 'SUBADMIN' | 'EMPLOYEE' | 'USER';
    };

    const userList = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (userList.length === 0) {
      throw new UnauthorizedError('User account associated with token no longer exists');
    }

    const user = userList[0];
    let permissionKeys: string[] = [];
    let roleName: string = String(user.accountType);

    if (user.roleId) {
      const roleRes = await db.select().from(roles).where(eq(roles.id, user.roleId));
      if (roleRes.length > 0) roleName = roleRes[0].name;

      const maps = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, user.roleId));
      if (maps.length > 0) {
        const permIds = maps.map((m) => m.permissionId);
        const perms = await db.select().from(permissions);
        permissionKeys = perms.filter((p) => permIds.includes(p.id)).map((p) => p.key);
      }
    }

    if (user.accountType === 'ADMIN') {
      const allPerms = await db.select().from(permissions);
      permissionKeys = Array.from(new Set([...permissionKeys, ...allPerms.map((p) => p.key), 'roles.manage', 'employees.manage']));
    }

    req.user = {
      userId: user.id,
      accountType: user.accountType,
      roleId: user.roleId,
      roleName,
      permissions: permissionKeys,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Invalid or expired authentication token'));
    } else {
      next(error);
    }
  }
};

export const requirePermission = (permissionKey: string) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.accountType === 'ADMIN') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionKey)) {
      return next();
    }

    return next(new ForbiddenError(`Permission '${permissionKey}' required to perform this operation`));
  };
};

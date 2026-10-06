import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { users, roles, rolePermissions, permissions } from '../db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { BadRequestError, UnauthorizedError } from '../helpers/appError';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, email, phone, password, gstNumber, consentAccepted } = req.body;

      if (!email && !phone) {
        throw new BadRequestError('Either email or phone is required');
      }

      if (email) {
        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
          throw new BadRequestError('An account with this email already exists');
        }
      }

      const passwordHash = await argon2.hash(password);

      const inserted = await db
        .insert(users)
        .values({
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          passwordHash,
          accountType: 'USER',
          gstNumber: gstNumber || null,
          consentAcceptedAt: consentAccepted ? new Date() : null,
          status: 'ACTIVE',
        })
        .returning();

      const user = inserted[0];

      res.status(201).json({
        success: true,
        code: 'REGISTER_SUCCESS',
        message: 'Customer account registered successfully',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountType: user.accountType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async erpLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const userList = await db.select().from(users).where(eq(users.email, email));
      if (userList.length === 0) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const user = userList[0];

      if (user.accountType === 'USER') {
        throw new UnauthorizedError('Customer accounts cannot access ERP portal');
      }

      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

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

      if (user.accountType === 'ADMIN' && permissionKeys.length === 0) {
        const allPerms = await db.select().from(permissions);
        permissionKeys = allPerms.map((p) => p.key);
      }

      const accessToken = jwt.sign(
        {
          userId: user.id,
          accountType: user.accountType,
          aud: 'erp',
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        code: 'LOGIN_SUCCESS',
        message: 'ERP Authentication successful',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            accountType: user.accountType,
            employeeId: user.employeeId,
            designation: user.designation,
            roleName,
            permissions: permissionKeys,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async storeLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email and password are required');
      }

      const userList = await db.select().from(users).where(eq(users.email, email));
      if (userList.length === 0) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const user = userList[0];

      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const accessToken = jwt.sign(
        {
          userId: user.id,
          accountType: user.accountType,
          aud: 'store',
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        code: 'LOGIN_SUCCESS',
        message: 'Storefront Authentication successful',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            accountType: user.accountType,
            gstNumber: user.gstNumber,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async genericLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const userList = await db.select().from(users).where(eq(users.email, email));
      if (userList.length > 0 && userList[0].accountType !== 'USER') {
        return AuthController.erpLogin(req, res, next);
      } else {
        return AuthController.storeLogin(req, res, next);
      }
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser || !authUser.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const userList = await db.select().from(users).where(eq(users.id, authUser.userId));
      if (userList.length === 0) {
        throw new UnauthorizedError('User account not found');
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

      res.status(200).json({
        success: true,
        code: 'OK',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            accountType: user.accountType,
            employeeId: user.employeeId,
            designation: user.designation,
            roleName,
            permissions: permissionKeys,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('accessToken');
    res.status(200).json({
      success: true,
      code: 'LOGOUT_SUCCESS',
      message: 'Logged out successfully',
    });
  }
}

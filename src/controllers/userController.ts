import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { users, userWarehouses, roles } from '../db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { BadRequestError, NotFoundError } from '../helpers/appError';

export class UserController {
  public static async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userList = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          accountType: users.accountType,
          roleId: users.roleId,
          roleName: roles.name,
          employeeId: users.employeeId,
          designation: users.designation,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id));

      const formatted = userList.map((u) => ({
        ...u,
        roleName: u.roleName || (u.accountType === 'ADMIN' ? 'Admin' : u.accountType === 'SUBADMIN' ? 'Subadmin' : 'Employee'),
      }));

      res.status(200).json({
        success: true,
        code: 'OK',
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        accountType, // "SUBADMIN" or "EMPLOYEE"
        roleId,
        employeeId,
        departmentId,
        designation,
        warehouseIds, // array of warehouse IDs
      } = req.body;

      if (!email || !password || !accountType || !firstName || !lastName) {
        throw new BadRequestError('First name, last name, email, password, and accountType are required');
      }

      const existingEmail = await db.select().from(users).where(eq(users.email, email));
      if (existingEmail.length > 0) {
        throw new BadRequestError('An employee with this email already exists');
      }

      const passwordHash = await argon2.hash(password);

      const inserted = await db
        .insert(users)
        .values({
          firstName,
          lastName,
          email,
          phone: phone || null,
          passwordHash,
          accountType: accountType as any,
          roleId: roleId || null,
          employeeId: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          departmentId: departmentId || null,
          designation: designation || (accountType === 'SUBADMIN' ? 'Operations Manager' : 'Inventory Specialist'),
          status: 'ACTIVE',
        })
        .returning();

      const newEmployee = inserted[0];

      // Assign warehouse access
      if (warehouseIds && Array.isArray(warehouseIds)) {
        for (const warehouseId of warehouseIds) {
          await db.insert(userWarehouses).values({
            userId: newEmployee.id,
            warehouseId,
          });
        }
      }

      let roleName = accountType;
      if (roleId) {
        const roleRes = await db.select().from(roles).where(eq(roles.id, roleId));
        if (roleRes.length > 0) roleName = roleRes[0].name;
      }

      res.status(201).json({
        success: true,
        code: 'EMPLOYEE_CREATED',
        message: `${accountType} account created successfully`,
        data: {
          ...newEmployee,
          roleName,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body; // "ACTIVE" | "SUSPENDED" | "INACTIVE"

      const updated = await db
        .update(users)
        .set({ status })
        .where(eq(users.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundError('User account not found');
      }

      res.status(200).json({
        success: true,
        code: 'USER_STATUS_UPDATED',
        message: `Account status updated to ${status}`,
        data: updated[0],
      });
    } catch (error) {
      next(error);
    }
  }
}

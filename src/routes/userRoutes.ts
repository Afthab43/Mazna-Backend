import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.get('/users', authenticateToken, UserController.getUsers);
router.post('/users/employee', authenticateToken, requirePermission('employees.manage'), UserController.createEmployee);
router.patch('/users/:id/status', authenticateToken, requirePermission('employees.manage'), UserController.updateUserStatus);

export default router;

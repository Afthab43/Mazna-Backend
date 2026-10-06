import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.get('/roles', authenticateToken, RoleController.getRoles);
router.post('/roles', authenticateToken, requirePermission('roles.manage'), RoleController.createRole);
router.put('/roles/:roleId/permissions', authenticateToken, requirePermission('roles.manage'), RoleController.updateRolePermissions);
router.get('/permissions', authenticateToken, RoleController.getPermissions);

export default router;

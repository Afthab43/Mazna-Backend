import { Router } from 'express';
import { NavigationController } from '../controllers/navigationController';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.get('/navigation', authenticateToken, NavigationController.getNavigationConfig);
router.put('/navigation', authenticateToken, requirePermission('roles.manage'), NavigationController.saveNavigationConfig);
router.post('/navigation/reset', authenticateToken, requirePermission('roles.manage'), NavigationController.resetNavigationConfig);

export default router;

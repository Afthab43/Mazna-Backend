import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/me', authenticateToken, AuthController.getMe);
router.post('/register', AuthController.register);
router.post('/erp/login', AuthController.erpLogin);
router.post('/store/login', AuthController.storeLogin);
router.post('/login', AuthController.genericLogin);
router.post('/logout', AuthController.logout);

export default router;

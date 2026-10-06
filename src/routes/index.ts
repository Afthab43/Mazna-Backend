import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import navigationRoutes from './navigationRoutes';
import productRoutes from './productRoutes';
import inventoryRoutes from './inventoryRoutes';
import purchaseOrderRoutes from './purchaseOrderRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', userRoutes);
router.use('/system', roleRoutes);
router.use('/system', navigationRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;

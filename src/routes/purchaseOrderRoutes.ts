import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrderController';

const router = Router();

router.get('/', PurchaseOrderController.getPurchaseOrders);
router.post('/', PurchaseOrderController.createPurchaseOrder);

export default router;

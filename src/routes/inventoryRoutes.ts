import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';

const router = Router();

router.get('/overview', InventoryController.getInventoryOverview);
router.post('/adjust', InventoryController.adjustStock);

export default router;

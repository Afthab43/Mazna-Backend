import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();

router.get('/', ProductController.getProducts);
router.post('/', ProductController.createProduct);

router.put('/:id', ProductController.updateProduct);

export default router;


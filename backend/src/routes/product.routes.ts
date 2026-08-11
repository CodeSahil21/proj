import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getProducts,
  createProduct,
  updateProduct,
  getStockMovements,
  adjustStock,
} from '../controllers/product.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getProducts);
router.post('/', authorize('ADMIN', 'WAREHOUSE'), createProduct);
router.put('/:id', authorize('ADMIN', 'WAREHOUSE'), updateProduct);
router.get('/:id/movements', authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'), getStockMovements);
router.post('/:id/stock', authorize('ADMIN', 'WAREHOUSE'), adjustStock);

export default router;

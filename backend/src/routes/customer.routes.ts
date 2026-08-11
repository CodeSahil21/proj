import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  createFollowUp,
  getFollowUps,
} from '../controllers/customer.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES', 'ACCOUNTS'), getCustomers);
router.post('/', authorize('ADMIN', 'SALES'), createCustomer);
router.get('/:id', authorize('ADMIN', 'SALES', 'ACCOUNTS'), getCustomer);
router.put('/:id', authorize('ADMIN', 'SALES'), updateCustomer);
router.get('/:id/followups', authorize('ADMIN', 'SALES'), getFollowUps);
router.post('/:id/followups', authorize('ADMIN', 'SALES'), createFollowUp);

export default router;

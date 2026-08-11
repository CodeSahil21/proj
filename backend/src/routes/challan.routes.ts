import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getChallans,
  createChallan,
  getChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challan.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallans);
router.post('/', authorize('ADMIN', 'SALES'), createChallan);
router.get('/:id', authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallan);
router.patch('/:id/confirm', authorize('ADMIN', 'SALES'), confirmChallan);
router.patch('/:id/cancel', authorize('ADMIN', 'SALES'), cancelChallan);

export default router;

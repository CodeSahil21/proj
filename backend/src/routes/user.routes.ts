import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getUsers, createUser, updateUser } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;

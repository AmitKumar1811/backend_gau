import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, updateProfile, getOrders, getOrder } from '../controllers/userController.js';

const router = Router();

router.use(authenticate);
router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrder);

export default router;

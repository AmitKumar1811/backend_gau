import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { createOrderFromCart, buyNow, getMyOrders, getOrderById, updateOrderStatusAdmin } from '../controllers/orderController.js';

const router = Router();
router.use(authenticate);

router.post('/cart', createOrderFromCart);
router.post('/buy-now', buyNow);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', authorizeRoles('admin'), updateOrderStatusAdmin);

export default router;

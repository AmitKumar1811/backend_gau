import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getStats, listUsers, toggleBlockUser, listOrders, listProducts, listCategories } from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, authorizeRoles('admin'));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.get('/orders', listOrders);
router.get('/products', listProducts);
router.get('/categories', listCategories);

export default router;

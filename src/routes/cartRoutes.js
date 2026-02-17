import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCart, addToCart, updateCartItem, removeCartItem } from '../controllers/cartController.js';

const router = Router();
router.use(authenticate);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/', updateCartItem);
router.delete('/:productId', removeCartItem);

export default router;

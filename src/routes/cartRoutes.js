import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../controllers/cartController.js';

const router = Router();
router.use(authenticate);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/', updateCartItem);
router.delete('/', clearCart);
router.delete('/:productId', removeCartItem);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist
} from '../controllers/wishlistController.js';

const router = Router();

router.use(authenticate);

router
    .route('/')
    .get(getWishlist)
    .post(addToWishlist);

router.delete('/:productId', removeFromWishlist);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createRazorpayOrder, verifyPayment } from '../controllers/paymentController.js';

const router = Router();
router.use(authenticate);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);

export default router;

import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductsByCategoryId } from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/id/:id', getProduct);
router.get('/category/:categoryid', getProductsByCategoryId);
router.post('/', authenticate, authorizeRoles('admin'), createProduct);
router.put('/:id', authenticate, authorizeRoles('admin'), updateProduct);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteProduct);

export default router;

import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, authorizeRoles('admin'), createCategory);
router.put('/:id', authenticate, authorizeRoles('admin'), updateCategory);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCategory);

export default router;

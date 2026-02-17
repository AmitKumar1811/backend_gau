import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getAddresses,
    getAddress,
    addAddress,
    updateAddress,
    deleteAddress
} from '../controllers/addressController.js';

const router = Router();

router.use(authenticate);

router
    .route('/')
    .get(getAddresses)
    .post(addAddress);

router
    .route('/:id')
    .get(getAddress)
    .put(updateAddress)
    .delete(deleteAddress);

export default router;

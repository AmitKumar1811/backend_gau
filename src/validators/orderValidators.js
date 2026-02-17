import Joi from 'joi';
import { addressSchema } from './authValidators.js';

export const createOrderFromCartSchema = Joi.object({
  addressId: Joi.string().optional()
});

export const buyNowSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
  address: addressSchema.required()
});

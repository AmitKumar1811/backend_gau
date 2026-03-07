import Joi from 'joi';

const objectIdSchema = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.empty': 'Product ID is required',
    'string.pattern.base': 'Invalid product ID'
  });

export const addToCartSchema = Joi.object({
  productId: objectIdSchema,
  quantity: Joi.number().integer().min(1).max(999).default(1)
});

export const updateCartSchema = Joi.object({
  productId: objectIdSchema,
  quantity: Joi.number().integer().min(0).max(999).required()
});

export const cartProductParamSchema = Joi.object({
  productId: objectIdSchema
});

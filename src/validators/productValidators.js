import Joi from 'joi';

export const productCreateSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  description: Joi.string().allow('', null),
  benefits: Joi.array().items(Joi.string()),
  ingredients: Joi.array().items(Joi.string()),
  price: Joi.number().required(),
  discountPrice: Joi.number().optional(),
  stock: Joi.number().integer().min(0).default(0),
  weight: Joi.string().allow('', null),
  images: Joi.array().items(Joi.string().uri()),
  categoryId: Joi.string().required(),
  isOrganicCertified: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

export const productUpdateSchema = productCreateSchema.fork(
  ['name', 'slug', 'price', 'categoryId'],
  (schema) => schema.optional()
);

import Joi from 'joi';

export const categoryCreateSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  description: Joi.string().allow('', null),
  isActive: Joi.boolean().default(true)
});

export const categoryUpdateSchema = categoryCreateSchema.fork(['name', 'slug'], (schema) => schema.optional());

import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(8).max(15).required(),
  password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const addressSchema = Joi.object({
  fullName: Joi.string().required(),
  phone: Joi.string().required(),
  addressLine: Joi.string().required(),
  landmark: Joi.string().allow('', null),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().required(),
  country: Joi.string().default('India'),
  isDefault: Joi.boolean().default(false)
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(60),
  phone: Joi.string().min(8).max(15)
});

export const passwordChangeSchema = Joi.object({
  password: Joi.string().min(6).required()
});

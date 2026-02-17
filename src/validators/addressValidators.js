import Joi from 'joi';

export const addressCreateSchema = Joi.object({
    type: Joi.string().required(),
    name: Joi.string().required(),
    phone: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().allow('', null).optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().required(),
    isDefault: Joi.boolean().default(false)
});

export const addressUpdateSchema = addressCreateSchema.fork(
    ['type', 'name', 'phone', 'addressLine1', 'city', 'state', 'pincode'],
    (schema) => schema.optional()
);

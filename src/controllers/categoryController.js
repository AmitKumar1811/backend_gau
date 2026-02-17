import slugify from 'slugify';
import Category from '../models/Category.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../validators/categoryValidators.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const payload = { ...req.body, slug: req.body.slug || slugify(req.body.name, { lower: true }) };
    const { value, error } = categoryCreateSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });
    const category = await Category.create(value);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const payload = req.body;
    if (payload.name && !payload.slug) payload.slug = slugify(payload.name, { lower: true });
    const { value, error } = categoryUpdateSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });
    const category = await Category.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

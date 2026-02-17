import slugify from 'slugify';
import Product from '../models/Product.js';
import { productCreateSchema, productUpdateSchema } from '../validators/productValidators.js';

export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, minPrice, maxPrice } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.categoryId = category;
    if (minPrice || maxPrice) filter.price = { $gte: Number(minPrice) || 0, $lte: Number(maxPrice) || Number.MAX_SAFE_INTEGER };

    const products = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(filter);

    res.json({ data: products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const payload = { ...req.body, slug: req.body.slug || slugify(req.body.name, { lower: true }) };
    const { value, error } = productCreateSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });
    const product = await Product.create(value);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const payload = req.body;
    if (payload.name && !payload.slug) payload.slug = slugify(payload.name, { lower: true });
    const { value, error } = productUpdateSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });
    const product = await Product.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { addToCartSchema } from '../validators/cartValidators.js';

const computePrice = (product) => product.discountPrice || product.price;

export const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    res.json(cart || { items: [], total: 0 });
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { value, error } = addToCartSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const product = await Product.findById(value.productId);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id, 'items.productId': { $ne: product._id } },
      { $push: { items: { ...value, priceSnapshot: computePrice(product) } } },
      { new: true, upsert: true }
    );

    if (!cart) {
      const existingCart = await Cart.findOne({ userId: req.user.id });
      const updated = existingCart.items.map((item) =>
        item.productId.toString() === product._id.toString()
          ? { ...item.toObject(), quantity: item.quantity + value.quantity }
          : item
      );
      existingCart.items = updated;
      await existingCart.save();
      return res.json(existingCart);
    }

    res.status(201).json(cart);
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { value, error } = addToCartSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id, 'items.productId': value.productId },
      { $set: { 'items.$.quantity': value.quantity } },
      { new: true }
    );
    if (!cart) return res.status(404).json({ message: 'Cart item not found' });
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { items: { productId } } },
      { new: true }
    );
    res.json(cart || { items: [] });
  } catch (err) {
    next(err);
  }
};

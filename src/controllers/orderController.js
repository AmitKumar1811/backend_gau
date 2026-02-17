import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createOrderFromCartSchema, buyNowSchema } from '../validators/orderValidators.js';

const calculateCartTotal = (cart) => cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

export const createOrderFromCart = async (req, res, next) => {
  try {
    const { value, error } = createOrderFromCartSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const user = await User.findById(req.user.id);
    const address = user.addresses.id(value.addressId) || user.addresses.find((a) => a.isDefault);
    if (!address) return res.status(400).json({ message: 'Address required' });

    const total = calculateCartTotal(cart);

    const order = await Order.create({
      userId: req.user.id,
      products: cart.items,
      totalAmount: total,
      addressSnapshot: address
    });

    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

export const buyNow = async (req, res, next) => {
  try {
    const { value, error } = buyNowSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const product = await Product.findById(value.productId);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });

    const price = product.discountPrice || product.price;
    const order = await Order.create({
      userId: req.user.id,
      products: [{ productId: product._id, quantity: value.quantity, priceSnapshot: price }],
      totalAmount: price * value.quantity,
      addressSnapshot: value.address
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatusAdmin = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

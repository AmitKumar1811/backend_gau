import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Cart from '../models/Cart.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const computeCurrentPrice = (product) => (
  typeof product.discountPrice === 'number' ? product.discountPrice : product.price
);

export const getStats = async (req, res, next) => {
  try {
    const [users, orders, revenueAgg, lowStock] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Product.find({ stock: { $lt: 10 } }).select('name stock')
    ]);

    res.json({
      totalUsers: users,
      totalOrders: orders,
      totalRevenue: revenueAgg[0]?.total || 0,
      lowStockProducts: lowStock
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ id: user._id, isBlocked: user.isBlocked });
  } catch (err) {
    next(err);
  }
};

export const listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

export const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

export const getCartInsights = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';

    if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const pipeline = [{ $match: { 'items.0': { $exists: true } } }];

    if (productId) {
      pipeline.push({
        $match: { 'items.productId': new mongoose.Types.ObjectId(productId) }
      });
    }

    const userMatch = { 'user.role': 'user' };
    if (search) {
      const safeRegex = new RegExp(escapeRegex(search), 'i');
      userMatch.$or = [
        { 'user.name': safeRegex },
        { 'user.email': safeRegex },
        { 'user.phone': safeRegex }
      ];
    }

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          let: { cartUserId: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$cartUserId'] } } },
            { $project: { name: 1, email: 1, phone: 1, isBlocked: 1, createdAt: 1, role: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: userMatch },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalUsers' }],
          carts: [{ $skip: (page - 1) * limit }, { $limit: limit }]
        }
      }
    );

    const [result] = await Cart.aggregate(pipeline);
    const carts = result?.carts || [];
    const totalUsers = result?.metadata?.[0]?.totalUsers || 0;
    const pages = totalUsers ? Math.ceil(totalUsers / limit) : 0;

    if (!carts.length) {
      return res.json({ data: [], totalUsers, page, limit, pages });
    }

    const uniqueProductIds = [
      ...new Set(
        carts.flatMap((cart) => (cart.items || []).map((item) => item.productId?.toString()).filter(Boolean))
      )
    ];

    const products = uniqueProductIds.length
      ? await Product.find({ _id: { $in: uniqueProductIds } }).select('name slug images price discountPrice stock isActive')
      : [];

    const productsById = new Map(products.map((product) => [product._id.toString(), product]));

    const data = carts
      .map((cart) => {
        const userProducts = (cart.items || [])
          .filter((item) => !productId || item.productId?.toString() === productId)
          .map((item) => {
            const currentProduct = item.productId ? productsById.get(item.productId.toString()) : null;
            return {
              productId: item.productId,
              product: currentProduct
                ? {
                    id: currentProduct._id,
                    name: currentProduct.name,
                    slug: currentProduct.slug,
                    images: currentProduct.images || [],
                    stock: currentProduct.stock,
                    isActive: currentProduct.isActive,
                    currentPrice: computeCurrentPrice(currentProduct)
                  }
                : null,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
              lineTotal: item.quantity * item.priceSnapshot,
              addedAt: item.addedAt || null,
              lastUpdatedAt: item.lastUpdatedAt || null
            };
          })
          .filter((item) => item.productId);

        const totalQuantity = userProducts.reduce((sum, item) => sum + item.quantity, 0);
        const estimatedCartValue = userProducts.reduce((sum, item) => sum + item.lineTotal, 0);

        return {
          cartId: cart._id,
          user: {
            id: cart.user._id,
            name: cart.user.name,
            email: cart.user.email,
            phone: cart.user.phone || null,
            isBlocked: Boolean(cart.user.isBlocked),
            createdAt: cart.user.createdAt || null
          },
          products: userProducts,
          totalProducts: userProducts.length,
          totalQuantity,
          estimatedCartValue,
          cartUpdatedAt: cart.updatedAt || null
        };
      })
      .filter((entry) => entry.products.length > 0);

    res.json({
      data,
      totalUsers,
      page,
      limit,
      pages
    });
  } catch (err) {
    next(err);
  }
};

import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { addToCartSchema, cartProductParamSchema, updateCartSchema } from '../validators/cartValidators.js';

const MAX_ITEM_QUANTITY = 999;
const CART_PRODUCT_FIELDS = 'name slug images price discountPrice stock isActive';

const computePrice = (product) => (typeof product.discountPrice === 'number' ? product.discountPrice : product.price);
const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;

  if (value instanceof mongoose.Types.ObjectId || value?._bsontype === 'ObjectId') {
    return value.toString();
  }

  if (typeof value === 'object' && value._id && value._id !== value) {
    return toIdString(value._id);
  }

  if (typeof value.toString === 'function') {
    const asString = value.toString();
    return asString === '[object Object]' ? null : asString;
  }

  return null;
};
const getItemProductId = (item) => toIdString(item?.productId);
const removeInvalidCartItemsInPlace = (cart) => {
  const hasArrayItems = Array.isArray(cart.items);
  const sourceItems = hasArrayItems ? cart.items : [];
  const originalLength = sourceItems.length;
  cart.items = sourceItems.filter((item) => Boolean(getItemProductId(item)));
  return !hasArrayItems || cart.items.length !== originalLength;
};

const buildEmptyCart = () => ({
  id: null,
  userId: null,
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  totalAmount: 0,
  total: 0,
  createdAt: null,
  updatedAt: null
});

const buildCartResponse = (cart) => {
  if (!cart) return buildEmptyCart();

  const items = (cart.items || [])
    .map((item) => {
      const product = item.productId && item.productId._id ? item.productId : null;
      const productId = toIdString(product?._id || item.productId || null);

      if (!productId) return null;

      return {
        productId,
        product: product
          ? {
              id: toIdString(product._id),
              name: product.name,
              slug: product.slug,
              images: product.images || [],
              stock: product.stock,
              isActive: product.isActive,
              currentPrice: computePrice(product)
            }
          : null,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        lineTotal: item.quantity * item.priceSnapshot,
        addedAt: item.addedAt || null,
        lastUpdatedAt: item.lastUpdatedAt || null
      };
    })
    .filter(Boolean);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const userId = toIdString(cart.userId);

  return {
    id: toIdString(cart._id),
    userId,
    items,
    totalItems: items.length,
    totalQuantity,
    totalAmount,
    total: totalAmount,
    createdAt: cart.createdAt || null,
    updatedAt: cart.updatedAt || null
  };
};

const populateCart = async (cart) => {
  await cart.populate({
    path: 'items.productId',
    select: CART_PRODUCT_FIELDS
  });
};

const sanitizeCartItems = (items) => {
  let changed = false;
  const now = new Date();

  const sanitizedItems = items.reduce((acc, item) => {
    const product = item.productId && item.productId._id ? item.productId : null;
    if (!product || !product.isActive || product.stock < 1) {
      changed = true;
      return acc;
    }

    const quantity = Math.min(Math.max(item.quantity || 1, 1), product.stock, MAX_ITEM_QUANTITY);
    const priceSnapshot = typeof item.priceSnapshot === 'number' ? item.priceSnapshot : computePrice(product);
    const addedAt = item.addedAt || now;
    const lastUpdatedAt = item.lastUpdatedAt || addedAt;

    if (
      quantity !== item.quantity ||
      priceSnapshot !== item.priceSnapshot ||
      !item.addedAt ||
      !item.lastUpdatedAt
    ) {
      changed = true;
    }

    const existingEntryIndex = acc.findIndex(
      (entry) => entry.productId.toString() === product._id.toString()
    );

    if (existingEntryIndex >= 0) {
      const mergedQuantity = Math.min(
        acc[existingEntryIndex].quantity + quantity,
        product.stock,
        MAX_ITEM_QUANTITY
      );
      if (mergedQuantity !== acc[existingEntryIndex].quantity + quantity) changed = true;

      acc[existingEntryIndex].quantity = mergedQuantity;
      acc[existingEntryIndex].lastUpdatedAt = lastUpdatedAt;
      changed = true;
      return acc;
    }

    acc.push({
      productId: product._id,
      quantity,
      priceSnapshot,
      addedAt,
      lastUpdatedAt
    });
    return acc;
  }, []);

  return { changed, sanitizedItems };
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate({
      path: 'items.productId',
      select: CART_PRODUCT_FIELDS
    });

    if (!cart) return res.json(buildEmptyCart());

    const { changed, sanitizedItems } = sanitizeCartItems(cart.items || []);
    if (changed) {
      cart.items = sanitizedItems;
      await cart.save();
      if (cart.items.length) await populateCart(cart);
    }

    res.json(buildCartResponse(cart));
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { value, error } = addToCartSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const product = await Product.findById(value.productId).select(CART_PRODUCT_FIELDS);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < 1) return res.status(400).json({ message: 'Product is out of stock' });

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      try {
        cart = await Cart.create({ userId: req.user.id, items: [] });
      } catch (createErr) {
        // Two simultaneous add-to-cart calls can race on unique userId index.
        if (createErr?.code === 11000) {
          cart = await Cart.findOne({ userId: req.user.id });
        } else {
          throw createErr;
        }
      }
    }

    if (!cart) return res.status(500).json({ message: 'Failed to create cart' });

    removeInvalidCartItemsInPlace(cart);

    const matchingItemIndexes = [];
    let existingQuantity = 0;

    cart.items.forEach((item, index) => {
      const currentProductId = getItemProductId(item);
      if (currentProductId === value.productId) {
        matchingItemIndexes.push(index);
        existingQuantity += item.quantity || 0;
      }
    });

    const existingItemIndex = matchingItemIndexes[0] ?? -1;

    const now = new Date();
    const unitPrice = computePrice(product);

    if (existingItemIndex >= 0) {
      const nextQuantity = existingQuantity + value.quantity;

      if (nextQuantity > MAX_ITEM_QUANTITY) {
        return res.status(400).json({ message: `Maximum quantity per item is ${MAX_ITEM_QUANTITY}` });
      }
      if (nextQuantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) available in stock`,
          availableStock: product.stock
        });
      }

      cart.items[existingItemIndex].quantity = nextQuantity;
      cart.items[existingItemIndex].priceSnapshot = unitPrice;
      cart.items[existingItemIndex].lastUpdatedAt = now;

      for (let index = matchingItemIndexes.length - 1; index >= 1; index -= 1) {
        cart.items.splice(matchingItemIndexes[index], 1);
      }
    } else {
      if (value.quantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) available in stock`,
          availableStock: product.stock
        });
      }

      cart.items.push({
        productId: product._id,
        quantity: value.quantity,
        priceSnapshot: unitPrice,
        addedAt: now,
        lastUpdatedAt: now
      });
    }

    await cart.save();
    await populateCart(cart);

    res.status(existingItemIndex >= 0 ? 200 : 201).json(buildCartResponse(cart));
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { value, error } = updateCartSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    removeInvalidCartItemsInPlace(cart);

    const matchingItemIndexes = [];
    cart.items.forEach((item, index) => {
      if (getItemProductId(item) === value.productId) matchingItemIndexes.push(index);
    });

    const itemIndex = matchingItemIndexes[0] ?? -1;
    if (itemIndex === -1) return res.status(404).json({ message: 'Cart item not found' });

    if (value.quantity === 0) {
      cart.items = cart.items.filter((item) => getItemProductId(item) !== value.productId);
      await cart.save();
      if (cart.items.length) await populateCart(cart);
      return res.json(buildCartResponse(cart));
    }

    const product = await Product.findById(value.productId).select(CART_PRODUCT_FIELDS);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < 1) return res.status(400).json({ message: 'Product is out of stock' });

    if (value.quantity > MAX_ITEM_QUANTITY) {
      return res.status(400).json({ message: `Maximum quantity per item is ${MAX_ITEM_QUANTITY}` });
    }
    if (value.quantity > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} item(s) available in stock`,
        availableStock: product.stock
      });
    }

    cart.items[itemIndex].quantity = value.quantity;
    cart.items[itemIndex].priceSnapshot = computePrice(product);
    cart.items[itemIndex].lastUpdatedAt = new Date();

    for (let index = matchingItemIndexes.length - 1; index >= 1; index -= 1) {
      cart.items.splice(matchingItemIndexes[index], 1);
    }

    await cart.save();
    await populateCart(cart);
    res.json(buildCartResponse(cart));
  } catch (err) {
    next(err);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const { value, error } = cartProductParamSchema.validate(req.params, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    removeInvalidCartItemsInPlace(cart);

    const initialCount = cart.items.length;
    cart.items = cart.items.filter((item) => getItemProductId(item) !== value.productId);
    if (cart.items.length === initialCount) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cart.save();
    if (cart.items.length) await populateCart(cart);
    res.json(buildCartResponse(cart));
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.json(buildEmptyCart());

    if (cart.items.length === 0) return res.json(buildCartResponse(cart));

    cart.items = [];
    await cart.save();

    res.json(buildCartResponse(cart));
  } catch (err) {
    next(err);
  }
};

import User from '../models/User.js';
import Order from '../models/Order.js';
import { updateProfileSchema, addressSchema } from '../validators/authValidators.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { value, error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const user = await User.findByIdAndUpdate(req.user.id, value, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const { value, error } = addressSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const update = { $push: { addresses: value } };
    if (value.isDefault) {
      update.$set = { 'addresses.$[].isDefault': false };
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.status(201).json(user.addresses);
  } catch (err) {
    next(err);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const { value, error } = addressSchema.min(1).validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, 'addresses._id': addressId },
      { $set: { 'addresses.$': { ...value, _id: addressId } } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Address not found' });
    res.json(user.addresses);
  } catch (err) {
    next(err);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    ).select('-password');
    res.json(user.addresses);
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

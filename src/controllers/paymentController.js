import crypto from 'crypto';
import { razorpayInstance } from '../config/razorpay.js';
import Order from '../models/Order.js';

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const options = {
      amount: Math.round(order.totalAmount * 100),
      currency: 'INR',
      receipt: `order_rcpt_${order._id}`
    };

    const rpOrder = await razorpayInstance.orders.create(options);
    order.razorpayOrderId = rpOrder.id;
    await order.save();

    res.json({ orderId: rpOrder.id, amount: rpOrder.amount, currency: rpOrder.currency });
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Invalid signature' });
    }

    order.paymentStatus = 'paid';
    order.orderStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    await order.save();

    res.json({ message: 'Payment verified', order });
  } catch (err) {
    next(err);
  }
};

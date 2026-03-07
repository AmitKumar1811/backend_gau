import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceSnapshot: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true }
);

cartSchema.index({ 'items.productId': 1 });

export default mongoose.model('Cart', cartSchema);

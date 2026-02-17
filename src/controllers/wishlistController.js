import User from '../models/User.js';
import Product from '../models/Product.js';

// Get wishlist
export const getWishlist = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.wishlist);
    } catch (error) {
        next(error);
    }
};

// Add to wishlist
export const addToWishlist = async (req, res, next) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if product is already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        user.wishlist.push(productId);
        await user.save();

        // Populate the newly added product detailed info?
        // Or just return the updated wishlist IDs?Usually returning the updated list is good but can be heavy.
        // Let's return the full populated list to keep frontend in sync easily.
        await user.populate('wishlist');

        res.status(200).json(user.wishlist);
    } catch (error) {
        next(error);
    }
};

// Remove from wishlist
export const removeFromWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { wishlist: productId } },
            { new: true }
        ).populate('wishlist');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.wishlist);
    } catch (error) {
        next(error);
    }
};

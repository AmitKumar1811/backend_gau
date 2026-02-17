import User from '../models/User.js';
import { addressCreateSchema, addressUpdateSchema } from '../validators/addressValidators.js';

// Get all addresses
export const getAddresses = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('addresses');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.addresses);
    } catch (error) {
        next(error);
    }
};

// Get single address
export const getAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('addresses');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        res.status(200).json(address);
    } catch (error) {
        next(error);
    }
};

// Add address
export const addAddress = async (req, res, next) => {
    try {
        const { value, error } = addressCreateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (value.isDefault) {
            user.addresses.forEach((addr) => {
                addr.isDefault = false;
            });
        } else if (user.addresses.length === 0) {
            // If first address, make it default automatically
            value.isDefault = true;
        }

        user.addresses.push(value);
        await user.save();

        res.status(201).json(user.addresses);
    } catch (error) {
        next(error);
    }
};

// Update address
export const updateAddress = async (req, res, next) => {
    try {
        const { value, error } = addressUpdateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        if (value.isDefault) {
            user.addresses.forEach((addr) => {
                if (addr._id.toString() !== req.params.id) {
                    addr.isDefault = false;
                }
            });
        }

        Object.assign(address, value);
        await user.save();

        res.status(200).json(user.addresses);
    } catch (error) {
        next(error);
    }
};

// Delete address
export const deleteAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // address.remove() is deprecated in Mongoose 7+. Use pull or deleteOne on subdoc array.
        user.addresses.pull(req.params.id);
        await user.save();

        res.status(200).json(user.addresses);
    } catch (error) {
        next(error);
    }
};

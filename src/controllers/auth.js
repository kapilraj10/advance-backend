const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register user
exports.register = async (req, res) => {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
        return res.status(400).json({ msg: 'Please provide name, email and password' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, email, password, username: email });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id } };
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not set in environment');
            return res.status(500).json({ msg: 'Server misconfiguration: JWT secret not set' });
        }

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) {
                console.error('jwt.sign error:', err);
                return res.status(500).json({ msg: 'Error creating token' });
            }
            return res.status(201).json({ token });
        });
    } catch (err) {
        console.error('register error:', err.stack || err);
        if (err && err.code === 11000) {
            const dupField = err.keyValue ? Object.keys(err.keyValue)[0] : 'unknown';
            return res.status(409).json({ msg: `Duplicate value for field: ${dupField}` });
        }
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Login user
exports.login = async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ msg: 'Please provide email and password' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const payload = { user: { id: user.id } };
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not set in environment');
            return res.status(500).json({ msg: 'Server misconfiguration: JWT secret not set' });
        }

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) {
                console.error('jwt.sign error:', err);
                return res.status(500).json({ msg: 'Error creating token' });
            }
            return res.json({ token });
        });
    } catch (err) {
        console.error('login error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
        const user = await User.findById(req.user.id).select('-password');
        return res.json(user);
    } catch (err) {
        console.error('getProfile error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

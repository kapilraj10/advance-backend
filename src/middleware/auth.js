const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (!authHeader) return res.status(401).json({ msg: 'No token, authorization denied' });

    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader;

    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not set in environment');
        return res.status(500).json({ msg: 'Server misconfiguration: JWT secret not set' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('auth middleware token error:', err && err.message ? err.message : err);
        return res.status(401).json({ msg: 'Token is not valid' });
    }
};

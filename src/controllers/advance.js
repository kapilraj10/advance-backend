const Advance = require('../models/Advance');
const mongoose = require('mongoose');

// Create a new advance
exports.createAdvance = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { title, description, staffName, staffEmail, staffPhone, amount, startDate, type, paymentMode, remarks } = req.body || {};
        if (!title || !staffName || !staffEmail || amount == null || !startDate) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        const user_id = req.user && req.user.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;

        const adv = new Advance({ title, description, staffName, staffEmail, staffPhone, amount, startDate, type, paymentMode, remarks, user_id });
        await adv.save();
        return res.status(201).json(adv);
    } catch (err) {
        console.error('createAdvance error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Add a day-by-day usage to an advance
exports.addUsage = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { advance_id } = req.params;
        const { date, amount, description } = req.body || {};
        if (!date || amount == null) return res.status(400).json({ msg: 'Missing date or amount' });

        const adv = await Advance.findOne({ advance_id });
        if (!adv) return res.status(404).json({ msg: 'Advance not found' });
        if (adv.user_id && req.user && String(adv.user_id) !== String(req.user.id)) {
            return res.status(403).json({ msg: 'Unauthorized access' });
        }

        adv.usages.push({ date, amount, description });
        await adv.save();
        return res.json(adv);
    } catch (err) {
        console.error('addUsage error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Get advance with computed totals
exports.getAdvance = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { advance_id } = req.params;
        const adv = await Advance.findOne({ advance_id }).lean();
        if (!adv) return res.status(404).json({ msg: 'Advance not found' });
        if (adv.user_id && req.user && String(adv.user_id) !== String(req.user.id)) {
            return res.status(403).json({ msg: 'Unauthorized access' });
        }

        const totalSpent = (adv.usages || []).reduce((s, u) => s + (u.amount || 0), 0);
        const remaining = adv.amount - totalSpent;
        return res.json({ ...adv, totalSpent, remaining });
    } catch (err) {
        console.error('getAdvance error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Monthly summary for all advances (optionally month=YYYY-MM)
exports.monthlySummary = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { month } = req.query;
        let matchStart, matchEnd;
        if (month) {
            const [y, m] = month.split('-').map(Number);
            matchStart = new Date(y, m - 1, 1);
            matchEnd = new Date(y, m, 1);
        }

        const baseFilter = {};
        if (req.user && req.user.id) baseFilter.user_id = new mongoose.Types.ObjectId(req.user.id);
        const filter = matchStart ? { ...baseFilter, startDate: { $gte: matchStart, $lt: matchEnd } } : baseFilter;
        const advances = await Advance.find(filter).lean();

        const result = advances.map(a => {
            const totalSpent = (a.usages || []).reduce((s, u) => s + (u.amount || 0), 0);
            const remaining = a.amount - totalSpent;
            let status = 'Partially Remaining';
            if (remaining === 0) status = 'Fully Used';
            if (remaining < 0) status = 'Overused';
            return {
                id: a.advance_id || a._id,
                title: a.title,
                staffName: a.staffName,
                staffEmail: a.staffEmail,
                amountGiven: a.amount,
                totalSpent,
                remaining,
                status
            };
        });

        const totals = result.reduce((acc, r) => {
            acc.totalGiven += r.amountGiven;
            acc.totalUsed += r.totalSpent;
            return acc;
        }, { totalGiven: 0, totalUsed: 0 });
        totals.remaining = totals.totalGiven - totals.totalUsed;

        return res.json({ perAdvance: result, totals });
    } catch (err) {
        console.error('monthlySummary error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Dashboard stats
exports.dashboard = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const userFilter = {};
        if (req.user && req.user.id) userFilter.user_id = new mongoose.Types.ObjectId(req.user.id);
        userFilter.startDate = { $gte: start, $lt: end };
        const advances = await Advance.find(userFilter).lean();

        const totalThisMonth = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const staffSummary = advances.reduce((acc, a) => {
            const spent = (a.usages || []).reduce((s, u) => s + (u.amount || 0), 0);
            const rem = (a.amount || 0) - spent;
            acc[a.staffEmail] = acc[a.staffEmail] || { staffName: a.staffName, staffEmail: a.staffEmail, given: 0, used: 0, remaining: 0 };
            acc[a.staffEmail].given += a.amount || 0;
            acc[a.staffEmail].used += spent;
            acc[a.staffEmail].remaining += rem;
            return acc;
        }, {});

        const alerts = Object.values(staffSummary).filter(s => s.remaining < (0.1 * s.given));

        return res.json({ totalThisMonth, staffSummary: Object.values(staffSummary), alerts });
    } catch (err) {
        console.error('dashboard error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Update advance (owner only)
exports.updateAdvance = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { advance_id } = req.params;
        const updatable = ['title', 'description', 'staffName', 'staffEmail', 'staffPhone', 'amount', 'startDate', 'type', 'paymentMode', 'remarks'];
        const payload = {};
        updatable.forEach(k => { if (typeof req.body[k] !== 'undefined') payload[k] = req.body[k]; });

        const adv = await Advance.findOne({ advance_id });
        if (!adv) return res.status(404).json({ msg: 'Advance not found' });
        if (adv.user_id && String(adv.user_id) !== String(req.user.id)) return res.status(403).json({ msg: 'Unauthorized access' });

        Object.assign(adv, payload);
        await adv.save();
        return res.json(adv);
    } catch (err) {
        console.error('updateAdvance error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Delete advance (owner only)
exports.deleteAdvance = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'No token, authorization denied' });
        const { advance_id } = req.params;
        const adv = await Advance.findOne({ advance_id });
        if (!adv) return res.status(404).json({ msg: 'Advance not found' });
        if (adv.user_id && String(adv.user_id) !== String(req.user.id)) return res.status(403).json({ msg: 'Unauthorized access' });

        await Advance.deleteOne({ advance_id });
        return res.json({ msg: 'Advance deleted' });
    } catch (err) {
        console.error('deleteAdvance error:', err.stack || err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

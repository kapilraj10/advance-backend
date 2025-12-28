const express = require('express');
const router = express.Router();
const advanceCtrl = require('../controllers/advance');
const auth = require('../middleware/auth');

// All advance routes require auth
router.post('/', auth, advanceCtrl.createAdvance);
router.post('/:advance_id/usages', auth, advanceCtrl.addUsage);
router.get('/:advance_id', auth, advanceCtrl.getAdvance);
router.get('/', auth, advanceCtrl.monthlySummary); // optional ?month=YYYY-MM
router.get('/dashboard/stats', auth, advanceCtrl.dashboard);
router.put('/:advance_id', auth, advanceCtrl.updateAdvance);
router.delete('/:advance_id', auth, advanceCtrl.deleteAdvance);

module.exports = router;

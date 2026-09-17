const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Protect all kitchen routes
router.use(verifyToken);
router.use(authorizeRoles('kitchen', 'admin'));

// Orders queue
router.get('/orders', kitchenController.getKitchenOrders);

// Status progression (received -> preparing -> ready -> completed / cancelled)
router.patch('/orders/:id/status', kitchenController.updateOrderStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Create order (Authenticated users / Students)
router.post('/', verifyToken, orderController.createOrder);

// Student orders history
router.get('/student', verifyToken, authorizeRoles('student'), orderController.getStudentOrders);

// View single order by ID
router.get('/:id', verifyToken, orderController.getOrderById);

module.exports = router;

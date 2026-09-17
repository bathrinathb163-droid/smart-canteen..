const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Protect all admin routes
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// Analytics
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);

module.exports = router;

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public menu browsing
router.get('/', menuController.getAllMenuItems);
router.get('/:id', menuController.getMenuItemById);

// Admin only: Add, edit, delete food items
router.post('/', verifyToken, authorizeRoles('admin'), menuController.createMenuItem);
router.put('/:id', verifyToken, authorizeRoles('admin'), menuController.updateMenuItem);
router.delete('/:id', verifyToken, authorizeRoles('admin'), menuController.deleteMenuItem);

// Admin & Kitchen: Toggle availability
router.patch('/:id/toggle-availability', verifyToken, authorizeRoles('admin', 'kitchen'), menuController.toggleAvailability);

module.exports = router;

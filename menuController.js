const { query } = require('../config/db');

// GET /api/menu
async function getAllMenuItems(req, res, next) {
  try {
    const { category, search, available_only } = req.query;

    let sql = 'SELECT * FROM food_items WHERE 1=1';
    const params = [];

    if (available_only === 'true' || available_only === '1') {
      sql += ' AND availability = TRUE';
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (food_name LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY category ASC, food_name ASC';

    const [items] = await query(sql, params);
    return res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/menu/:id
async function getMenuItemById(req, res, next) {
  try {
    const { id } = req.params;
    const [items] = await query('SELECT * FROM food_items WHERE food_id = ?', [id]);
    const item = items && items[0];

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found.'
      });
    }

    return res.json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/menu (Admin Only)
async function createMenuItem(req, res, next) {
  try {
    const { food_name, description, category, price, availability, image } = req.body;

    if (!food_name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Food name, category, and price are required.'
      });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number.'
      });
    }

    const isAvail = availability !== undefined ? (Boolean(availability) ? 1 : 0) : 1;
    const defaultImg = image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

    const sql = `INSERT INTO food_items (food_name, description, category, price, availability, image) VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await query(sql, [food_name.trim(), description || '', category, numPrice, isAvail, defaultImg]);

    const newId = result[0]?.insertId || result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Food item added to canteen menu successfully!',
      data: {
        food_id: newId,
        food_name: food_name.trim(),
        description: description || '',
        category,
        price: numPrice,
        availability: isAvail,
        image: defaultImg
      }
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/menu/:id (Admin Only)
async function updateMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const { food_name, description, category, price, availability, image } = req.body;

    const [existing] = await query('SELECT * FROM food_items WHERE food_id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found.'
      });
    }

    const current = existing[0];
    const updatedName = food_name !== undefined ? food_name.trim() : current.food_name;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedCat = category !== undefined ? category : current.category;
    const updatedPrice = price !== undefined ? parseFloat(price) : current.price;
    const updatedAvail = availability !== undefined ? (Boolean(availability) ? 1 : 0) : current.availability;
    const updatedImg = image !== undefined ? image : current.image;

    const sql = `UPDATE food_items SET food_name = ?, description = ?, category = ?, price = ?, availability = ?, image = ? WHERE food_id = ?`;
    await query(sql, [updatedName, updatedDesc, updatedCat, updatedPrice, updatedAvail, updatedImg, id]);

    return res.json({
      success: true,
      message: 'Food item updated successfully!',
      data: {
        food_id: Number(id),
        food_name: updatedName,
        description: updatedDesc,
        category: updatedCat,
        price: updatedPrice,
        availability: updatedAvail,
        image: updatedImg
      }
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/menu/:id (Admin Only)
async function deleteMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM food_items WHERE food_id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found.'
      });
    }

    await query('DELETE FROM food_items WHERE food_id = ?', [id]);

    return res.json({
      success: true,
      message: `Food item "${existing[0].food_name}" removed from menu.`
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/menu/:id/toggle-availability (Admin & Kitchen)
async function toggleAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM food_items WHERE food_id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found.'
      });
    }

    const current = existing[0];
    const newStatus = current.availability ? 0 : 1;

    await query('UPDATE food_items SET availability = ? WHERE food_id = ?', [newStatus, id]);

    return res.json({
      success: true,
      message: `Status updated to ${newStatus ? 'AVAILABLE' : 'SOLD OUT'}`,
      data: {
        food_id: Number(id),
        food_name: current.food_name,
        availability: newStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};

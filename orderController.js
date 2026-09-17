const { query } = require('../config/db');

// Helper to generate daily sequential token: C-001, C-002...
async function generateDailyToken() {
  try {
    // Count orders placed today
    const [result] = await query(
      `SELECT COUNT(*) AS count FROM orders WHERE DATE(order_time) = CURDATE()`
    );
    const countToday = result && result[0] ? Number(result[0].count) : 0;
    const nextSequence = countToday + 1;
    return `C-${String(nextSequence).padStart(3, '0')}`;
  } catch (err) {
    // Fallback if CURDATE() is unsupported in test driver
    const [allOrders] = await query('SELECT COUNT(*) AS count FROM orders');
    const totalCount = allOrders && allOrders[0] ? Number(allOrders[0].count) : 0;
    return `C-${String(totalCount + 1).padStart(3, '0')}`;
  }
}

// POST /api/orders (Student places order)
async function createOrder(req, res, next) {
  try {
    const userId = req.user.userId;
    const { items, payment_method } = req.body;

    // 1. Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add at least one food item.'
      });
    }

    // 2. Validate quantities
    for (const item of items) {
      if (!item.food_id || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item or quantity in cart. All quantities must be greater than zero.'
        });
      }
    }

    // 3. Fetch current food items from database to compute authentic price and verify availability
    const foodIds = items.map(i => Number(i.food_id));
    const placeholders = foodIds.map(() => '?').join(',');
    const [dbFoods] = await query(`SELECT * FROM food_items WHERE food_id IN (${placeholders})`, foodIds);

    const foodMap = new Map();
    dbFoods.forEach(f => foodMap.set(f.food_id, f));

    // Verify all items exist and are available
    let calculatedTotal = 0;
    const validatedLineItems = [];

    for (const item of items) {
      const food = foodMap.get(Number(item.food_id));
      if (!food) {
        return res.status(404).json({
          success: false,
          message: `Food item #${item.food_id} was not found on the menu.`
        });
      }

      if (!food.availability) {
        return res.status(400).json({
          success: false,
          message: `"${food.food_name}" is currently SOLD OUT. Please update your cart.`
        });
      }

      const qty = parseInt(item.quantity, 10);
      const itemPrice = parseFloat(food.price);
      const lineSubtotal = itemPrice * qty;
      calculatedTotal += lineSubtotal;

      validatedLineItems.push({
        food_id: food.food_id,
        food_name: food.food_name,
        quantity: qty,
        price: itemPrice,
        image: food.image,
        category: food.category
      });
    }

    // 4. Generate daily sequential token
    const tokenNumber = await generateDailyToken();

    const chosenPaymentMethod = payment_method || 'Cash at Counter';
    const initialPaymentStatus = 'pending';
    const initialOrderStatus = 'received';

    // 5. Insert order record
    const orderSql = `
      INSERT INTO orders (user_id, token_number, total_amount, payment_method, payment_status, order_status, order_time)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const orderResult = await query(orderSql, [
      userId,
      tokenNumber,
      calculatedTotal,
      chosenPaymentMethod,
      initialPaymentStatus,
      initialOrderStatus
    ]);

    const orderId = orderResult[0]?.insertId || orderResult.insertId;

    // 6. Insert order line items
    for (const line of validatedLineItems) {
      const itemSql = `INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)`;
      await query(itemSql, [orderId, line.food_id, line.quantity, line.price]);
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully! Please collect your token.',
      data: {
        order_id: orderId,
        token_number: tokenNumber,
        total_amount: calculatedTotal,
        order_status: initialOrderStatus,
        payment_method: chosenPaymentMethod,
        payment_status: initialPaymentStatus,
        order_time: new Date(),
        items: validatedLineItems
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/student/orders (Logged in student orders)
async function getStudentOrders(req, res, next) {
  try {
    const userId = req.user.userId;

    const [orders] = await query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY order_time DESC`,
      [userId]
    );

    // Fetch line items for each order
    const enrichedOrders = await Promise.all(
      orders.map(async order => {
        const [items] = await query(
          `SELECT oi.order_item_id, oi.food_id, oi.quantity, oi.price, fi.food_name, fi.image, fi.category
           FROM order_items oi
           LEFT JOIN food_items fi ON oi.food_id = fi.food_id
           WHERE oi.order_id = ?`,
          [order.order_id]
        );
        return {
          ...order,
          items: items || []
        };
      })
    );

    return res.json({
      success: true,
      count: enrichedOrders.length,
      data: enrichedOrders
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id (View single order details)
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    const [orders] = await query(
      `SELECT o.*, u.name AS student_name, u.email AS student_email
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.order_id = ?`,
      [id]
    );

    const order = orders && orders[0];
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Role check: Only the student who placed it, or kitchen/admin can view
    if (role === 'student' && order.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own orders.'
      });
    }

    // Fetch items
    const [items] = await query(
      `SELECT oi.order_item_id, oi.food_id, oi.quantity, oi.price, fi.food_name, fi.image, fi.category
       FROM order_items oi
       LEFT JOIN food_items fi ON oi.food_id = fi.food_id
       WHERE oi.order_id = ?`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items: items || []
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getStudentOrders,
  getOrderById
};

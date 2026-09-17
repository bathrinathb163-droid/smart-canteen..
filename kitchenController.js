const { query } = require('../config/db');

// GET /api/kitchen/orders
async function getKitchenOrders(req, res, next) {
  try {
    const { status } = req.query;

    let sql = `
      SELECT o.*, u.name AS student_name, u.email AS student_email
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND o.order_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.order_time DESC';

    const [orders] = await query(sql, params);

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

    // Grouping stats
    const stats = {
      total_today: enrichedOrders.length,
      received: enrichedOrders.filter(o => o.order_status === 'received').length,
      preparing: enrichedOrders.filter(o => o.order_status === 'preparing').length,
      ready: enrichedOrders.filter(o => o.order_status === 'ready').length,
      completed: enrichedOrders.filter(o => o.order_status === 'completed').length,
      cancelled: enrichedOrders.filter(o => o.order_status === 'cancelled').length
    };

    return res.json({
      success: true,
      stats,
      data: enrichedOrders
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/kitchen/orders/:id/status
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    // Fetch current order
    const [orders] = await query('SELECT * FROM orders WHERE order_id = ?', [id]);
    const currentOrder = orders && orders[0];

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Business rule: Completed orders cannot normally be changed back to preparing
    if (currentOrder.order_status === 'completed' && status === 'preparing') {
      return res.status(400).json({
        success: false,
        message: 'Completed orders cannot be reverted back to Preparing status.'
      });
    }

    // If marked completed, mark payment as paid if cash at counter
    const paymentUpdate = status === 'completed' ? ", payment_status = 'paid'" : '';

    const sql = `UPDATE orders SET order_status = ?${paymentUpdate} WHERE order_id = ?`;
    await query(sql, [status, id]);

    return res.json({
      success: true,
      message: `Order #${id} (Token: ${currentOrder.token_number}) status changed to "${status}".`,
      data: {
        order_id: Number(id),
        token_number: currentOrder.token_number,
        new_status: status
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getKitchenOrders,
  updateOrderStatus
};

const { query } = require('../config/db');

// GET /api/admin/dashboard
async function getDashboardStats(req, res, next) {
  try {
    // 1. Total Orders Today & Total Revenue Today
    // For universal compatibility with MySQL & SQLite/fallback:
    let ordersToday = 0;
    let revenueToday = 0;
    let pendingOrders = 0;

    try {
      const [todayStats] = await query(`
        SELECT 
          COUNT(*) AS total_orders_today,
          COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue_today,
          COALESCE(SUM(CASE WHEN order_status IN ('received', 'preparing') THEN 1 ELSE 0 END), 0) AS pending_orders
        FROM orders
        WHERE DATE(order_time) = CURDATE()
      `);
      if (todayStats && todayStats[0]) {
        ordersToday = Number(todayStats[0].total_orders_today || 0);
        revenueToday = parseFloat(todayStats[0].revenue_today || 0);
        pendingOrders = Number(todayStats[0].pending_orders || 0);
      }
    } catch (e) {
      // Fallback query across all orders
      const [allOrders] = await query('SELECT total_amount, order_status, order_time FROM orders');
      ordersToday = allOrders.length;
      revenueToday = allOrders
        .filter(o => o.order_status !== 'cancelled')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      pendingOrders = allOrders.filter(o => ['received', 'preparing'].includes(o.order_status)).length;
    }

    // 2. Food items count (Available vs Sold Out)
    const [foodItems] = await query('SELECT food_id, availability FROM food_items');
    const totalFoodItems = foodItems ? foodItems.length : 0;
    const availableFoodItems = foodItems ? foodItems.filter(f => f.availability == 1 || f.availability === true).length : 0;
    const soldOutFoodItems = totalFoodItems - availableFoodItems;

    // 3. Recent Orders (Latest 6)
    const [recentOrders] = await query(`
      SELECT o.*, u.name AS student_name, u.email AS student_email
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.order_time DESC
      LIMIT 6
    `);

    // Fetch items for recent orders
    const enrichedRecentOrders = await Promise.all(
      recentOrders.map(async ord => {
        const [items] = await query(
          `SELECT oi.quantity, oi.price, fi.food_name
           FROM order_items oi
           LEFT JOIN food_items fi ON oi.food_id = fi.food_id
           WHERE oi.order_id = ?`,
          [ord.order_id]
        );
        return { ...ord, items: items || [] };
      })
    );

    // 4. Popular food items (Calculated from actual order_items)
    let popularItems = [];
    try {
      const [pop] = await query(`
        SELECT fi.food_id, fi.food_name, fi.category, fi.price, fi.image,
               COALESCE(SUM(oi.quantity), 0) AS total_ordered,
               COALESCE(SUM(oi.quantity * oi.price), 0) AS total_sales
        FROM food_items fi
        JOIN order_items oi ON fi.food_id = oi.food_id
        GROUP BY fi.food_id, fi.food_name, fi.category, fi.price, fi.image
        ORDER BY total_ordered DESC
        LIMIT 5
      `);
      popularItems = pop;
    } catch (e) {
      popularItems = [];
    }

    return res.json({
      success: true,
      data: {
        stats: {
          orders_today: ordersToday,
          revenue_today: revenueToday,
          pending_orders: pendingOrders,
          available_items: availableFoodItems,
          sold_out_items: soldOutFoodItems,
          total_menu_items: totalFoodItems
        },
        recent_orders: enrichedRecentOrders,
        popular_items: popularItems
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
async function getAllUsers(req, res, next) {
  try {
    // Select user info without password, plus total orders placed
    const [users] = await query(`
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.role, 
        u.created_at,
        COUNT(o.order_id) AS order_count
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.user_id
      GROUP BY u.user_id, u.name, u.email, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);

    return res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAllUsers
};

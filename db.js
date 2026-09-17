const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_canteen',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  connectTimeout: 2000
};

let pool = null;
let isFallbackMode = false;

// Fallback in-memory/JSON store for instant out-of-the-box local testing
// if MySQL password is not yet configured on the host machine
const fallbackStore = {
  users: [],
  food_items: [],
  orders: [],
  order_items: [],
  lastUserId: 10,
  lastFoodId: 20,
  lastOrderId: 105,
  lastOrderItemId: 10
};

// Initialize fallback seed data
function initFallbackData() {
  const seedUsers = [
    {
      user_id: 1,
      name: 'Alex Sharma',
      email: 'student@college.com',
      // bcrypt hash for password123
      password: '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m',
      role: 'student',
      created_at: new Date()
    },
    {
      user_id: 2,
      name: 'Master Chef Ramesh',
      email: 'kitchen@canteen.com',
      password: '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m',
      role: 'kitchen',
      created_at: new Date()
    },
    {
      user_id: 3,
      name: 'Canteen Manager Verma',
      email: 'admin@canteen.com',
      password: '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m',
      role: 'admin',
      created_at: new Date()
    }
  ];

  const seedFood = [
    {
      food_id: 1,
      food_name: 'Masala Dosa',
      description: 'Crispy golden crepe filled with spiced mashed potato, served with coconut chutney & hot sambar',
      category: 'Breakfast',
      price: 40.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 2,
      food_name: 'Idli Vada Combo',
      description: 'Two steamed fluffy rice cakes and one crispy medu vada served with chutney & piping sambar',
      category: 'Breakfast',
      price: 30.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 3,
      food_name: 'Puri Bhaji',
      description: 'Three puffed golden puris served with aromatic spiced potato bhaji and pickle',
      category: 'Breakfast',
      price: 35.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 4,
      food_name: 'Veg Fried Rice',
      description: 'Aromatic basmati rice wok-tossed with fresh crunchy garden veggies and light soy seasoning',
      category: 'Lunch',
      price: 80.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 5,
      food_name: 'Chicken Biryani',
      description: 'Fragrant spiced basmati rice layered with succulent marinated chicken, boiled egg & cool raita',
      category: 'Lunch',
      price: 110.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 6,
      food_name: 'South Indian Thali',
      description: 'Wholesome platter of steamed rice, sambar, rasam, kootu, papad, curd and sweet payasam',
      category: 'Lunch',
      price: 90.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 7,
      food_name: 'Veg Burger',
      description: 'Crispy vegetable patty with melted cheese, fresh tomato, crisp lettuce and herb mayo in a toasted bun',
      category: 'Snacks',
      price: 60.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 8,
      food_name: 'Crispy Samosa (2 Pcs)',
      description: 'Flaky pastry pockets stuffed with spiced potatoes and peas, served with mint and tamarind chutneys',
      category: 'Snacks',
      price: 20.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 9,
      food_name: 'Paneer Tikka Roll',
      description: 'Smoky grilled cottage cheese wrapped in a whole-wheat flatbread with mint mayo & crunchy onions',
      category: 'Snacks',
      price: 70.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 10,
      food_name: 'Fresh Lime Soda',
      description: 'Refreshing chilled carbonated water with freshly squeezed lime, mint leaves and rock salt',
      category: 'Drinks',
      price: 30.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 11,
      food_name: 'Cutting Masala Chai',
      description: 'Rich, piping hot Indian tea brewed with fresh crushed ginger, cardamom and full-cream milk',
      category: 'Drinks',
      price: 15.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    },
    {
      food_id: 12,
      food_name: 'Thick Cold Coffee',
      description: 'Velvety chilled blended coffee made with rich milk, espresso shot and chocolate drizzle',
      category: 'Drinks',
      price: 45.0,
      availability: 1,
      image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
      created_at: new Date()
    }
  ];

  const now = new Date();
  const seedOrders = [
    {
      order_id: 101,
      user_id: 1,
      token_number: 'C-001',
      total_amount: 70.0,
      payment_method: 'Cash at Counter',
      payment_status: 'paid',
      order_status: 'completed',
      order_time: new Date(now.getTime() - 45 * 60000)
    },
    {
      order_id: 102,
      user_id: 1,
      token_number: 'C-002',
      total_amount: 110.0,
      payment_method: 'Cash at Counter',
      payment_status: 'pending',
      order_status: 'preparing',
      order_time: new Date(now.getTime() - 12 * 60000)
    },
    {
      order_id: 103,
      user_id: 1,
      token_number: 'C-003',
      total_amount: 45.0,
      payment_method: 'Cash at Counter',
      payment_status: 'pending',
      order_status: 'received',
      order_time: new Date(now.getTime() - 3 * 60000)
    }
  ];

  const seedOrderItems = [
    { order_item_id: 1, order_id: 101, food_id: 1, quantity: 1, price: 40.0 },
    { order_item_id: 2, order_id: 101, food_id: 11, quantity: 2, price: 15.0 },
    { order_item_id: 3, order_id: 102, food_id: 5, quantity: 1, price: 110.0 },
    { order_item_id: 4, order_id: 103, food_id: 12, quantity: 1, price: 45.0 }
  ];

  fallbackStore.users = seedUsers;
  fallbackStore.food_items = seedFood;
  fallbackStore.orders = seedOrders;
  fallbackStore.order_items = seedOrderItems;
}

// Check and initialize MySQL database tables
async function initDatabase() {
  try {
    // First try connecting without DB name to create it if needed
    const rootConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 2000
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await rootConn.end();

    // Now connect to the target database
    pool = mysql.createPool(dbConfig);
    const testConn = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL at ${dbConfig.host}:${dbConfig.port}, database: ${dbConfig.database}`);

    // Read and run schema.sql if tables don't exist
    const [tables] = await testConn.query(`SHOW TABLES LIKE 'food_items'`);
    if (tables.length === 0) {
      console.log('[Database] Initializing MySQL tables from schema.sql...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await testConn.query(statement);
      }
      console.log('[Database] Schema created successfully.');

      // Check if food_items is empty and seed
      const [foods] = await testConn.query('SELECT COUNT(*) as count FROM food_items');
      if (foods[0].count === 0) {
        console.log('[Database] Seeding initial data from seed.sql...');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf-8');
        const seedStatements = seedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of seedStatements) {
          try {
            await testConn.query(statement);
          } catch (e) {
            // Ignore duplicate or warning notices during seeding
          }
        }
        console.log('[Database] MySQL tables seeded successfully.');
      }
    }

    testConn.release();
    isFallbackMode = false;
    return true;
  } catch (err) {
    console.warn(`\n======================================================`);
    console.warn(`[Database Notice] Could not connect directly to MySQL server:`);
    console.warn(`Reason: ${err.message}`);
    console.warn(`--> If your MySQL root password is required, set DB_PASSWORD in backend/.env`);
    console.warn(`--> Starting seamlessly with built-in resilient database storage so all features are 100% testable right now!`);
    console.warn(`======================================================\n`);
    
    initFallbackData();
    isFallbackMode = true;
    return false;
  }
}

// Uniform query runner that transparently executes against MySQL if connected,
// or executes against the smart in-memory store if MySQL credentials are pending
async function query(sql, params = []) {
  if (!isFallbackMode && pool) {
    try {
      const [rows, fields] = await pool.query(sql, params);
      return [rows, fields];
    } catch (err) {
      console.error('[MySQL Query Error]:', err.message, 'SQL:', sql);
      throw err;
    }
  }

  // Fallback Engine
  return executeFallback(sql, params);
}

// Smart SQL simulator for fallback mode
function executeFallback(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT COUNT / stats
  if (/^SELECT\s+COUNT\(\*\)\s+AS\s+count\s+FROM\s+users\s+WHERE\s+email\s*=\s*\?/i.test(cleanSql)) {
    const email = params[0];
    const exists = fallbackStore.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    return [[{ count: exists ? 1 : 0 }]];
  }

  // 2. SELECT * FROM users WHERE email = ?
  if (/^SELECT\s+\*\s+FROM\s+users\s+WHERE\s+email\s*=\s*\?/i.test(cleanSql)) {
    const email = params[0];
    const user = fallbackStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return [user ? [user] : []];
  }

  // 3. SELECT user_id, name, email, role FROM users WHERE user_id = ?
  if (/FROM\s+users\s+WHERE\s+user_id\s*=\s*\?/i.test(cleanSql)) {
    const userId = params[0];
    const user = fallbackStore.users.find(u => u.user_id === Number(userId));
    if (user) {
      const { password, ...safeUser } = user;
      return [[safeUser]];
    }
    return [[]];
  }

  // 4. INSERT INTO users
  if (/^INSERT\s+INTO\s+users/i.test(cleanSql)) {
    fallbackStore.lastUserId += 1;
    const newUser = {
      user_id: fallbackStore.lastUserId,
      name: params[0],
      email: params[1],
      password: params[2],
      role: params[3] || 'student',
      created_at: new Date()
    };
    fallbackStore.users.push(newUser);
    return [{ insertId: newUser.user_id, affectedRows: 1 }];
  }

  // 5. SELECT * FROM food_items (with possible category, search, availability filters)
  if (/FROM\s+food_items/i.test(cleanSql) && /SELECT/i.test(cleanSql)) {
    // Single item by ID: WHERE food_id = ?
    if (/WHERE\s+food_id\s*=\s*\?/i.test(cleanSql)) {
      const item = fallbackStore.food_items.find(f => f.food_id === Number(params[0]));
      return [item ? [item] : []];
    }

    // Multiple items by IDs: WHERE food_id IN (...)
    if (/WHERE\s+food_id\s+IN/i.test(cleanSql)) {
      const ids = params.map(p => Number(p));
      const items = fallbackStore.food_items.filter(f => ids.includes(f.food_id));
      return [items];
    }

    let items = [...fallbackStore.food_items];

    // Filter by availability
    if (/availability\s*=\s*TRUE/i.test(cleanSql) || /availability\s*=\s*1/i.test(cleanSql)) {
      items = items.filter(f => f.availability === 1 || f.availability === true);
    }

    // Category filter
    if (/category\s*=\s*\?/i.test(cleanSql)) {
      const cat = params[0];
      items = items.filter(f => f.category.toLowerCase() === cat.toLowerCase());
    }

    // Search filter
    if (/food_name\s+LIKE\s*\?/i.test(cleanSql) || /description\s+LIKE\s*\?/i.test(cleanSql)) {
      const searchTerm = (params[params.length - 1] || '').replace(/%/g, '').toLowerCase();
      if (searchTerm) {
        items = items.filter(f => 
          f.food_name.toLowerCase().includes(searchTerm) || 
          f.description.toLowerCase().includes(searchTerm)
        );
      }
    }

    return [items];
  }

  // 6. INSERT INTO food_items
  if (/^INSERT\s+INTO\s+food_items/i.test(cleanSql)) {
    fallbackStore.lastFoodId += 1;
    const newItem = {
      food_id: fallbackStore.lastFoodId,
      food_name: params[0],
      description: params[1],
      category: params[2],
      price: parseFloat(params[3]),
      availability: params[4] === 1 || params[4] === true ? 1 : 0,
      image: params[5],
      created_at: new Date()
    };
    fallbackStore.food_items.push(newItem);
    return [{ insertId: newItem.food_id, affectedRows: 1 }];
  }

  // 7. UPDATE food_items SET ... WHERE food_id = ?
  if (/^UPDATE\s+food_items/i.test(cleanSql)) {
    const foodId = Number(params[params.length - 1]);
    const idx = fallbackStore.food_items.findIndex(f => f.food_id === foodId);
    if (idx !== -1) {
      // Check if it's toggle availability
      if (/SET\s+availability\s*=\s*\?/i.test(cleanSql) && params.length === 2) {
        fallbackStore.food_items[idx].availability = params[0] ? 1 : 0;
      } else {
        fallbackStore.food_items[idx] = {
          ...fallbackStore.food_items[idx],
          food_name: params[0],
          description: params[1],
          category: params[2],
          price: parseFloat(params[3]),
          availability: params[4] ? 1 : 0,
          image: params[5]
        };
      }
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 8. DELETE FROM food_items WHERE food_id = ?
  if (/^DELETE\s+FROM\s+food_items\s+WHERE\s+food_id\s*=\s*\?/i.test(cleanSql)) {
    const foodId = Number(params[0]);
    const initialLen = fallbackStore.food_items.length;
    fallbackStore.food_items = fallbackStore.food_items.filter(f => f.food_id !== foodId);
    return [{ affectedRows: initialLen - fallbackStore.food_items.length }];
  }

  // 9. Orders count for today (for sequential token)
  if (/SELECT\s+COUNT\(\*\)\s+AS\s+count\s+FROM\s+orders\s+WHERE/i.test(cleanSql) && /order_time/i.test(cleanSql)) {
    const today = new Date().toDateString();
    const todayOrders = fallbackStore.orders.filter(o => new Date(o.order_time).toDateString() === today);
    return [[{ count: todayOrders.length }]];
  }

  // 10. INSERT INTO orders
  if (/^INSERT\s+INTO\s+orders/i.test(cleanSql)) {
    fallbackStore.lastOrderId += 1;
    const newOrder = {
      order_id: fallbackStore.lastOrderId,
      user_id: Number(params[0]),
      token_number: params[1],
      total_amount: parseFloat(params[2]),
      payment_method: params[3] || 'Cash at Counter',
      payment_status: params[4] || 'pending',
      order_status: params[5] || 'received',
      order_time: new Date()
    };
    fallbackStore.orders.unshift(newOrder); // Keep most recent at beginning
    return [{ insertId: newOrder.order_id, affectedRows: 1 }];
  }

  // 11. INSERT INTO order_items
  if (/^INSERT\s+INTO\s+order_items/i.test(cleanSql)) {
    fallbackStore.lastOrderItemId += 1;
    const newOrderItem = {
      order_item_id: fallbackStore.lastOrderItemId,
      order_id: Number(params[0]),
      food_id: Number(params[1]),
      quantity: Number(params[2]),
      price: parseFloat(params[3])
    };
    fallbackStore.order_items.push(newOrderItem);
    return [{ insertId: newOrderItem.order_item_id, affectedRows: 1 }];
  }

  // 12. UPDATE orders SET order_status = ? WHERE order_id = ?
  if (/^UPDATE\s+orders\s+SET\s+order_status\s*=\s*\?/i.test(cleanSql)) {
    const status = params[0];
    const orderId = Number(params[1]);
    const order = fallbackStore.orders.find(o => o.order_id === orderId);
    if (order) {
      order.order_status = status;
      if (status === 'completed') {
        order.payment_status = 'paid';
      }
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 13. SELECT single order with user details: WHERE o.order_id = ?
  if (/FROM\s+orders\s+o/i.test(cleanSql) && /WHERE\s+o\.order_id\s*=\s*\?/i.test(cleanSql)) {
    const orderId = Number(params[0]);
    const order = fallbackStore.orders.find(o => o.order_id === orderId);
    if (!order) return [[]];

    const user = fallbackStore.users.find(u => u.user_id === order.user_id) || { name: 'Unknown', email: '' };
    return [[{
      ...order,
      student_name: user.name,
      student_email: user.email
    }]];
  }

  // 14. SELECT order items for order: WHERE order_id = ?
  if (/FROM\s+order_items/i.test(cleanSql) && /WHERE\s+(oi\.)?order_id\s*=\s*\?/i.test(cleanSql)) {
    const orderId = Number(params[0]);
    const items = fallbackStore.order_items
      .filter(oi => oi.order_id === orderId)
      .map(oi => {
        const food = fallbackStore.food_items.find(f => f.food_id === oi.food_id) || {};
        return {
          ...oi,
          food_name: food.food_name || 'Food Item',
          image: food.image || '',
          category: food.category || ''
        };
      });
    return [items];
  }

  // 15. Student orders: WHERE o.user_id = ?
  if (/FROM\s+orders\s+o/i.test(cleanSql) && /WHERE\s+o\.user_id\s*=\s*\?/i.test(cleanSql)) {
    const userId = Number(params[0]);
    const userOrders = fallbackStore.orders
      .filter(o => o.user_id === userId)
      .sort((a, b) => new Date(b.order_time) - new Date(a.order_time));
    return [userOrders];
  }

  // 16. Kitchen orders / All orders with user name
  if (/FROM\s+orders\s+o/i.test(cleanSql) && /JOIN\s+users\s+u/i.test(cleanSql)) {
    let ordersList = [...fallbackStore.orders];

    // Filter by status if requested
    if (/o\.order_status\s*=\s*\?/i.test(cleanSql)) {
      const st = params[0];
      ordersList = ordersList.filter(o => o.order_status === st);
    }

    const result = ordersList
      .sort((a, b) => new Date(b.order_time) - new Date(a.order_time))
      .map(o => {
        const user = fallbackStore.users.find(u => u.user_id === o.user_id) || { name: 'Student', email: '' };
        return {
          ...o,
          student_name: user.name,
          student_email: user.email
        };
      });

    return [result];
  }

  // 17. Admin Users list
  if (/FROM\s+users/i.test(cleanSql) && /order_count/i.test(cleanSql)) {
    const userList = fallbackStore.users.map(u => {
      const orderCount = fallbackStore.orders.filter(o => o.user_id === u.user_id).length;
      return {
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        order_count: orderCount
      };
    });
    return [userList];
  }

  // 18. Default fallback: return empty array
  return [[]];
}

module.exports = {
  query,
  initDatabase,
  getIsFallback: () => isFallbackMode,
  getFallbackStore: () => fallbackStore
};

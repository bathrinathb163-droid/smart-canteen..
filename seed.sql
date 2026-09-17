-- Smart Canteen Seed Data
USE smart_canteen;

-- Insert default demo accounts if not already present
-- Demo password for all: password123 (hashed with bcrypt cost 10: $2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m)
INSERT INTO users (user_id, name, email, password, role) VALUES
(1, 'Alex Sharma', 'student@college.com', '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m', 'student'),
(2, 'Master Chef Ramesh', 'kitchen@canteen.com', '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m', 'kitchen'),
(3, 'Canteen Manager Verma', 'admin@canteen.com', '$2a$10$X8a6.3f6/1hHk7H41z1bOeEsqLwF1E85E6r/iM3wGg37D0nFf8o5m', 'admin')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert Food items
INSERT INTO food_items (food_id, food_name, description, category, price, availability, image) VALUES
(1, 'Masala Dosa', 'Crispy golden crepe filled with spiced mashed potato, served with coconut chutney & hot sambar', 'Breakfast', 40.00, TRUE, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'),
(2, 'Idli Vada Combo', 'Two steamed fluffy rice cakes and one crispy medu vada served with chutney & piping sambar', 'Breakfast', 30.00, TRUE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80'),
(3, 'Puri Bhaji', 'Three puffed golden puris served with aromatic spiced potato bhaji and pickle', 'Breakfast', 35.00, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'),
(4, 'Veg Fried Rice', 'Aromatic basmati rice wok-tossed with fresh crunchy garden veggies and light soy seasoning', 'Lunch', 80.00, TRUE, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80'),
(5, 'Chicken Biryani', 'Fragrant spiced basmati rice layered with succulent marinated chicken, boiled egg & cool raita', 'Lunch', 110.00, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'),
(6, 'South Indian Thali', 'Wholesome platter of steamed rice, sambar, rasam, kootu, papad, curd and sweet payasam', 'Lunch', 90.00, TRUE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80'),
(7, 'Veg Burger', 'Crispy vegetable patty with melted cheese, fresh tomato, crisp lettuce and herb mayo in a toasted bun', 'Snacks', 60.00, TRUE, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'),
(8, 'Crispy Samosa (2 Pcs)', 'Flaky pastry pockets stuffed with spiced potatoes and peas, served with mint and tamarind chutneys', 'Snacks', 20.00, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'),
(9, 'Paneer Tikka Roll', 'Smoky grilled cottage cheese wrapped in a whole-wheat flatbread with mint mayo & crunchy onions', 'Snacks', 70.00, TRUE, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80'),
(10, 'Fresh Lime Soda', 'Refreshing chilled carbonated water with freshly squeezed lime, mint leaves and rock salt', 'Drinks', 30.00, TRUE, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80'),
(11, 'Cutting Masala Chai', 'Rich, piping hot Indian tea brewed with fresh crushed ginger, cardamom and full-cream milk', 'Drinks', 15.00, TRUE, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'),
(12, 'Thick Cold Coffee', 'Velvety chilled blended coffee made with rich milk, espresso shot and chocolate drizzle', 'Drinks', 45.00, TRUE, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE food_name=VALUES(food_name);

-- Seed sample orders for immediate demonstration
INSERT INTO orders (order_id, user_id, token_number, total_amount, payment_method, payment_status, order_status, order_time) VALUES
(101, 1, 'C-001', 70.00, 'Cash at Counter', 'paid', 'completed', NOW() - INTERVAL 45 MINUTE),
(102, 1, 'C-002', 110.00, 'Cash at Counter', 'pending', 'preparing', NOW() - INTERVAL 12 MINUTE),
(103, 1, 'C-003', 45.00, 'Cash at Counter', 'pending', 'received', NOW() - INTERVAL 3 MINUTE)
ON DUPLICATE KEY UPDATE token_number=VALUES(token_number);

INSERT INTO order_items (order_item_id, order_id, food_id, quantity, price) VALUES
(1, 101, 1, 1, 40.00),
(2, 101, 11, 2, 15.00),
(3, 102, 5, 1, 110.00),
(4, 103, 12, 1, 45.00)
ON DUPLICATE KEY UPDATE price=VALUES(price);

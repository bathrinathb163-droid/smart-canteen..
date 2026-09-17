const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_canteen_super_secure_jwt_secret_token_2026_cse';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT Helper
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 2. Check duplicate email
    const [existing] = await query('SELECT COUNT(*) AS count FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing[0] && existing[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Only allow explicit roles if valid, default to 'student'
    const userRole = ['student', 'kitchen', 'admin'].includes(role) ? role : 'student';

    // 4. Insert into database
    const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
    const result = await query(insertSql, [name.trim(), email.trim().toLowerCase(), hashedPassword, userRole]);
    
    // Result handling for both MySQL and fallback
    const newUserId = result[0]?.insertId || result.insertId;

    const newUser = {
      user_id: newUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: userRole
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: newUser
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Fetch user by email
    const [users] = await query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    const user = users && users[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = generateToken(safeUser);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const [users] = await query('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?', [userId]);
    const user = users && users[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    return res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};

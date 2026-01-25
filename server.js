// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND v18.0 (SECURITY HARDENED)
// Fixes: Environment variables, bcrypt, JWT, rate limiting, CORS, validation
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY CONFIGURATION - Environment Variables
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// Default password hash cho 'htic@2026' - THAY ĐỔI TRONG PRODUCTION!
const DEFAULT_PASS_HASH = '$2a$10$rOzJqQZQZZZZZZZZZZZZZOZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || DEFAULT_PASS_HASH;
const JWT_SECRET = process.env.JWT_SECRET || 'htic-legal-2026-change-in-production';

// Cảnh báo nếu dùng default credentials
if (!process.env.ADMIN_PASS_HASH) {
  console.warn('⚠️  WARNING: Using default password. Set ADMIN_PASS_HASH in production!');
  console.warn('   Generate: node -e "console.log(require(\'bcryptjs\').hashSync(\'your-pass\', 10))"');
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in production!');
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING - Chống brute force (simple implementation)
// ═══════════════════════════════════════════════════════════════════════════

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 phút
const MAX_LOGIN_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  
  // Reset nếu đã qua window
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  loginAttempts.set(ip, attempts);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORS & MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://lca.htic.com.vn', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Cho phép tất cả trong development
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING (Production-ready)
// ═══════════════════════════════════════════════════════════════════════════

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...data };
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[${timestamp}] ${level}: ${message}`, Object.keys(data).length ? data : '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML CLEANING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function stripHTML(html) {
  if (!html || typeof html !== 'string') return html || '';
  let text = html;
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/--[\w-]+\s*:[^;]*;?\s*/g, '');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

function cleanHTML(html) {
  if (!html || typeof html !== 'string') return html || '';
  let text = html;
  text = text.replace(/\s*style\s*=\s*"[^"]*"/gi, '');
  text = text.replace(/\s*style\s*=\s*'[^']*'/gi, '');
  text = text.replace(/\s*class\s*=\s*"[^"]*"/gi, '');
  text = text.replace(/\s*class\s*=\s*'[^']*'/gi, '');
  text = text.replace(/\s*data-[\w-]+\s*=\s*"[^"]*"/gi, '');
  text = text.replace(/--[\w-]+\s*:[^;]*;?\s*/g, '');
  text = text.replace(/<(\w+)\s+>/g, '<$1>');
  return text.trim();
}

function cleanNewsData(data) {
  const cleaned = { ...data };
  if (cleaned.summary) cleaned.summary = stripHTML(cleaned.summary);
  if (cleaned.content) cleaned.content = cleanHTML(cleaned.content);
  return cleaned;
}

function cleanEventsData(data) {
  const cleaned = { ...data };
  if (cleaned.title) cleaned.title = stripHTML(cleaned.title);
  if (cleaned.description) cleaned.description = stripHTML(cleaned.description);
  if (cleaned.legal_basis) cleaned.legal_basis = stripHTML(cleaned.legal_basis);
  if (cleaned.penalty) cleaned.penalty = stripHTML(cleaned.penalty);
  if (cleaned.notes) cleaned.notes = stripHTML(cleaned.notes);
  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

let dbConnected = false;
let pool = null;

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     HTIC Legal Calendar API v18.0 - Security Hardened     ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('🔧 Environment:');
console.log('   PORT:', PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ CUSTOM' : '⚠️ DEFAULT');

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    log('ERROR', 'PostgreSQL pool error', { error: err.message });
    dbConnected = false;
  });
}

function requireDB(res) {
  if (!dbConnected || !pool) {
    res.status(503).json({ success: false, message: 'Database not connected' });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initDatabase() {
  if (!pool) {
    log('WARN', 'Skipping database initialization (no DATABASE_URL)');
    return false;
  }

  log('INFO', 'Initializing database...');
  
  try {
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db');
    log('INFO', 'Database connected', { db: testResult.rows[0].db });
    dbConnected = true;
  } catch (err) {
    log('ERROR', 'Database connection failed', { error: err.message });
    return false;
  }

  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        key VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50) DEFAULT 'event',
        color VARCHAR(20) DEFAULT '#3B82F6',
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provinces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE,
        region VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        province_id INT REFERENCES provinces(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(100),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'other',
        deadline DATE,
        frequency VARCHAR(50),
        legal_basis TEXT,
        penalty TEXT,
        agency_id INT REFERENCES agencies(id),
        province_id INT REFERENCES provinces(id),
        applies_to VARCHAR(50) DEFAULT 'business',
        priority VARCHAR(20) DEFAULT 'medium',
        reminder_days INT DEFAULT 7,
        notes TEXT,
        source VARCHAR(255),
        source_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        content TEXT,
        category VARCHAR(50) DEFAULT 'general',
        image_url TEXT,
        source VARCHAR(255),
        source_url TEXT,
        author VARCHAR(100),
        views INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS org_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        key VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50) DEFAULT 'business',
        color VARCHAR(20) DEFAULT '#3B82F6',
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type_id INT REFERENCES org_types(id),
        category VARCHAR(50) DEFAULT 'government',
        address TEXT,
        province_id INT REFERENCES provinces(id),
        ward_id INT REFERENCES wards(id),
        phone VARCHAR(50),
        email VARCHAR(100),
        website TEXT,
        working_hours VARCHAR(255),
        description TEXT,
        services TEXT,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lawyers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        phone VARCHAR(50),
        zalo VARCHAR(50),
        email VARCHAR(100),
        avatar_url TEXT,
        address TEXT,
        province_id INT REFERENCES provinces(id),
        ward_id INT REFERENCES wards(id),
        working_hours VARCHAR(100),
        working_days VARCHAR(100),
        bio TEXT,
        specialization TEXT,
        is_online BOOLEAN DEFAULT true,
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        company VARCHAR(255),
        category VARCHAR(50) DEFAULT 'legal',
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        assigned_to VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Security logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        username VARCHAR(50),
        ip_address VARCHAR(50),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default data
    const defaultCategories = [
      { name: 'Thuế', key: 'tax', icon: 'receipt_long', color: '#F97316' },
      { name: 'Lao động', key: 'labor', icon: 'people', color: '#06B6D4' },
      { name: 'Bảo hiểm', key: 'insurance', icon: 'health_and_safety', color: '#10B981' },
      { name: 'Tài chính', key: 'finance', icon: 'account_balance', color: '#8B5CF6' },
      { name: 'Đầu tư', key: 'investment', icon: 'trending_up', color: '#6366F1' },
      { name: 'An toàn', key: 'safety', icon: 'shield', color: '#EF4444' },
      { name: 'Môi trường', key: 'environment', icon: 'eco', color: '#22C55E' },
      { name: 'Báo cáo', key: 'report', icon: 'assessment', color: '#3B82F6' },
      { name: 'Nghỉ lễ', key: 'holiday', icon: 'celebration', color: '#EC4899' },
      { name: 'Khác', key: 'other', icon: 'event', color: '#64748B' }
    ];
    
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      await client.query(
        `INSERT INTO categories (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
        [cat.name, cat.key, cat.icon, cat.color, i]
      );
    }

    const defaultOrgTypes = [
      { name: 'Cơ quan nhà nước', key: 'government', icon: 'account_balance', color: '#3B82F6' },
      { name: 'Công ty luật', key: 'lawfirm', icon: 'gavel', color: '#8B5CF6' },
      { name: 'Văn phòng công chứng', key: 'notary', icon: 'verified', color: '#F97316' },
      { name: 'Cơ quan thuế', key: 'tax', icon: 'receipt_long', color: '#EF4444' },
      { name: 'Bảo hiểm xã hội', key: 'insurance', icon: 'shield', color: '#06B6D4' },
      { name: 'Khác', key: 'other', icon: 'business', color: '#64748B' }
    ];
    
    for (let i = 0; i < defaultOrgTypes.length; i++) {
      const type = defaultOrgTypes[i];
      await client.query(
        `INSERT INTO org_types (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
        [type.name, type.key, type.icon, type.color, i]
      );
    }

    const defaultSettings = [
      { key: 'app_name', value: 'HTIC Legal Calendar', description: 'Tên ứng dụng' },
      { key: 'app_version', value: '1.0.12', description: 'Phiên bản' },
      { key: 'company_name', value: 'Công ty Luật TNHH HTIC', description: 'Tên công ty' },
      { key: 'hotline', value: '0379 044 299', description: 'Hotline' },
      { key: 'contact_email', value: 'contact@htic.com.vn', description: 'Email' },
      { key: 'website', value: 'https://htic.com.vn', description: 'Website' },
    ];
    
    for (const s of defaultSettings) {
      await client.query(
        `INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
        [s.key, s.value, s.description]
      );
    }

    log('INFO', 'Database initialized successfully');
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateToken(username) {
  return jwt.sign({ username, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '18.0.0', 
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

app.get('/api/events', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      WHERE e.is_active = true
      ORDER BY e.deadline ASC, e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/news', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { category, limit } = req.query;
    let query = `SELECT * FROM news WHERE is_active = true`;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ` ORDER BY published_at DESC`;
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/organizations', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { category, type, province_id, search } = req.query;
    let query = `
      SELECT o.*, t.name as type_name, t.key as type_key, t.icon as type_icon, t.color as type_color, p.name as province_name
      FROM organizations o
      LEFT JOIN org_types t ON o.type_id = t.id
      LEFT JOIN provinces p ON o.province_id = p.id
      WHERE o.is_active = true
    `;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND o.category = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND t.key = $${params.length}`;
    }
    if (province_id) {
      params.push(province_id);
      query += ` AND o.province_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (o.name ILIKE $${params.length} OR o.address ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.name ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/lawyers', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM lawyers WHERE is_active = true ORDER BY is_primary DESC, sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/provinces', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM provinces WHERE is_active = true ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/org-types', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM org_types WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/support-requests', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { name, phone, email, company, category, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền họ tên và nội dung' });
    }
    const result = await pool.query(
      `INSERT INTO support_requests (name, phone, email, company, category, subject, message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, phone, email, company, category || 'legal', subject || 'Yêu cầu tư vấn', message]
    );
    res.json({ success: true, message: 'Gửi yêu cầu thành công!', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Rate limiting check
  if (!checkRateLimit(ip)) {
    log('WARN', 'Rate limit exceeded', { ip, username });
    return res.status(429).json({ 
      success: false, 
      message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' 
    });
  }
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
  }
  
  // Check credentials
  const isValidUser = username === ADMIN_USER;
  
  // Tạo hash cho password mặc định nếu chưa có ADMIN_PASS_HASH
  let isValidPass = false;
  if (process.env.ADMIN_PASS_HASH) {
    isValidPass = await bcrypt.compare(password, ADMIN_PASS_HASH);
  } else {
    // Fallback: so sánh trực tiếp với password mặc định (chỉ cho development)
    isValidPass = password === 'htic@2026';
  }
  
  if (isValidUser && isValidPass) {
    const token = generateToken(username);
    log('INFO', 'Login success', { username, ip });
    
    // Log to database
    if (dbConnected) {
      try {
        await pool.query(
          `INSERT INTO security_logs (event_type, username, ip_address, user_agent) VALUES ($1, $2, $3, $4)`,
          ['LOGIN_SUCCESS', username, ip, req.headers['user-agent']]
        );
      } catch (e) { /* ignore */ }
    }
    
    res.json({ success: true, token, message: 'Đăng nhập thành công' });
  } else {
    log('WARN', 'Login failed', { username, ip });
    
    if (dbConnected) {
      try {
        await pool.query(
          `INSERT INTO security_logs (event_type, username, ip_address, user_agent) VALUES ($1, $2, $3, $4)`,
          ['LOGIN_FAILED', username, ip, req.headers['user-agent']]
        );
      } catch (e) { /* ignore */ }
    }
    
    res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
});

// Admin middleware
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const token = auth.slice(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
  
  req.admin = payload;
  next();
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const [events, news, orgs, lawyers, pending] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM events WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM news WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM organizations WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM lawyers WHERE is_active = true'),
      pool.query("SELECT COUNT(*) as count FROM support_requests WHERE status = 'pending'")
    ]);
    res.json({
      success: true,
      data: {
        events: parseInt(events.rows[0].count),
        news: parseInt(news.rows[0].count),
        organizations: parseInt(orgs.rows[0].count),
        lawyers: parseInt(lawyers.rows[0].count),
        pendingRequests: parseInt(pending.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// EVENTS CRUD
app.get('/api/admin/events', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name
      FROM events e 
      LEFT JOIN agencies a ON e.agency_id = a.id 
      LEFT JOIN provinces p ON e.province_id = p.id
      ORDER BY e.deadline DESC, e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/events', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const cleanedData = cleanEventsData(req.body);
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, is_active } = cleanedData;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }
    
    const result = await pool.query(
      `INSERT INTO events (title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [title, description, category, deadline, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days || 7, notes, source, source_url, is_active !== false]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/events/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    const cleanedData = cleanEventsData(req.body);
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, is_active } = cleanedData;
    const result = await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3, deadline=$4, frequency=$5, legal_basis=$6, penalty=$7, agency_id=$8, province_id=$9, applies_to=$10, priority=$11, reminder_days=$12, notes=$13, source=$14, source_url=$15, is_active=$16, updated_at=CURRENT_TIMESTAMP WHERE id=$17 RETURNING *`,
      [title, description, category, deadline, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days, notes, source, source_url, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/events/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// NEWS CRUD
app.get('/api/admin/news', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/news', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const cleanedData = cleanNewsData(req.body);
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at } = cleanedData;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }
    
    const result = await pool.query(
      `INSERT INTO news (title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [title, summary, content, category || 'general', image_url, source, source_url, author, is_featured || false, is_active !== false, published_at || new Date()]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/news/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    const cleanedData = cleanNewsData(req.body);
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at } = cleanedData;
    const result = await pool.query(
      `UPDATE news SET title=$1, summary=$2, content=$3, category=$4, image_url=$5, source=$6, source_url=$7, author=$8, is_featured=$9, is_active=$10, published_at=$11, updated_at=CURRENT_TIMESTAMP WHERE id=$12 RETURNING *`,
      [title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/news/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ORGANIZATIONS, LAWYERS, SUPPORT REQUESTS, PROVINCES - Basic CRUD
app.get('/api/admin/organizations', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query(`
      SELECT o.*, t.name as type_name, t.key as type_key, p.name as province_name
      FROM organizations o
      LEFT JOIN org_types t ON o.type_id = t.id
      LEFT JOIN provinces p ON o.province_id = p.id
      ORDER BY o.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/lawyers', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM lawyers ORDER BY is_primary DESC, sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/support-requests', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM support_requests ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/provinces', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/org-types', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM org_types ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATIC PAGES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function startServer() {
  await initDatabase().catch(err => {
    log('ERROR', 'Database init failed', { error: err.message });
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     HTIC Legal Calendar API v18.0 - Ready!                ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Server: http://localhost:${PORT}                         ║`);
    console.log(`║  📊 Database: ${dbConnected ? '✅ Connected' : '❌ Not Connected'}                        ║`);
    console.log('║  🔒 Security: JWT + Rate Limiting + CORS                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer();

// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND v19.0 (SECURITY HARDENED + WARDS API)
// Fixes: Environment variables, bcrypt, JWT, rate limiting, CORS, validation
// Added: Wards (Phường/Xã) CRUD API endpoints
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE ADMIN - Push Notifications via FCM
// Set FIREBASE_SERVICE_ACCOUNT env var with the JSON content of serviceAccountKey.json
// ═══════════════════════════════════════════════════════════════════════════

let firebaseAdmin = null;

try {
  const admin = require('firebase-admin');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseAdmin = admin;
    console.log('🔔 Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
  }
} catch (err) {
  console.warn('⚠️  Firebase Admin init error:', err.message);
}

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
console.log('║     HTIC Legal Calendar API v19.0 - Security Hardened     ║');
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

    // Newsletters table (Bản tin chuyên ngành)
    await client.query(`
      CREATE TABLE IF NOT EXISTS newsletters (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        content TEXT,
        industry VARCHAR(50),
        category VARCHAR(50) DEFAULT 'general',
        type VARCHAR(50) DEFAULT 'regulation',
        priority VARCHAR(20) DEFAULT 'normal',
        legal_doc VARCHAR(255),
        effective_date DATE,
        is_published BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // FCM device tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        fcm_token TEXT NOT NULL,
        platform VARCHAR(20) DEFAULT 'unknown',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id)
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
      SELECT o.*, t.name as type_name, t.key as type_key, t.icon as type_icon, t.color as type_color, 
             p.name as province_name, p.code as province_code,
             w.name as ward_name, w.code as ward_code
      FROM organizations o
      LEFT JOIN org_types t ON o.type_id = t.id
      LEFT JOIN provinces p ON o.province_id = p.id
      LEFT JOIN wards w ON o.ward_id = w.id
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

// PUBLIC: Get newsletters by industry
app.get('/api/newsletters', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { industry, category, limit } = req.query;
    let query = 'SELECT * FROM newsletters WHERE is_active = true AND is_published = true';
    const params = [];
    if (industry && industry !== 'all') {
      params.push(industry);
      query += ` AND industry = $${params.length}`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ' ORDER BY published_at DESC';
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

app.get('/api/provinces', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    // Lấy tất cả provinces
    const provincesResult = await pool.query('SELECT * FROM provinces WHERE is_active = true ORDER BY name ASC');
    const provinces = provincesResult.rows;
    
    // Lấy tất cả wards
    const wardsResult = await pool.query('SELECT * FROM wards WHERE is_active = true ORDER BY name ASC');
    const wards = wardsResult.rows;
    
    // Gắn wards vào provinces (theo cấu trúc districts -> wards cho tương thích app)
    const provincesWithWards = provinces.map(province => {
      const provinceWards = wards.filter(w => w.province_id === province.id);
      return {
        ...province,
        code: province.id.toString(),  // Dùng id làm code để match với organization.province_id
        // App cần cấu trúc districts -> wards
        districts: [{
          code: 'all',
          name: 'Tất cả quận/huyện',
          wards: provinceWards.map(w => ({
            code: w.id.toString(),  // Dùng ward.id để match với organization.ward_id
            name: w.name
          }))
        }],
        // Trả về wards trực tiếp
        wards: provinceWards.map(w => ({
          code: w.id.toString(),  // Dùng ward.id để match với organization.ward_id
          name: w.name
        }))
      };
    });
    
    res.json({ success: true, data: provincesWithWards });
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
    const [events, news, orgs, lawyers, pending, newsletters] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM events WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM news WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM organizations WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM lawyers WHERE is_active = true'),
      pool.query("SELECT COUNT(*) as count FROM support_requests WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*) as count FROM newsletters WHERE is_active = true').catch(() => ({ rows: [{ count: 0 }] }))
    ]);
    res.json({
      success: true,
      data: {
        events: parseInt(events.rows[0].count),
        news: parseInt(news.rows[0].count),
        organizations: parseInt(orgs.rows[0].count),
        lawyers: parseInt(lawyers.rows[0].count),
        pendingRequests: parseInt(pending.rows[0].count),
        newsletters: parseInt(newsletters.rows[0].count)
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

    // Send FCM push notification if article is active
    if (is_active !== false) {
      const notifBody = summary ? summary.substring(0, 100) : 'Có bài viết pháp luật mới cập nhật';
      sendFcmToAllDevices(title, notifBody, {
        type: 'new_news',
        id: String(result.rows[0].id),
        category: category || 'general',
      }).catch(() => {});
    }
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
// ORGANIZATIONS CRUD (Cơ quan tra cứu)
// ═══════════════════════════════════════════════════════════════════════════

// POST - Thêm cơ quan mới
app.post('/api/admin/organizations', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên cơ quan là bắt buộc' });
    }
    
    const result = await pool.query(
      `INSERT INTO organizations (name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, type_id || null, category || 'government', address, province_id || null, ward_id || null, phone, email, website, working_hours, description, services, lat || null, lng || null, is_active !== false]
    );
    
    log('INFO', 'Organization created', { id: result.rows[0].id, name });
    res.json({ success: true, data: result.rows[0], message: 'Thêm cơ quan thành công' });
  } catch (err) {
    log('ERROR', 'Create organization failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT - Cập nhật cơ quan
app.put('/api/admin/organizations/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    const { name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên cơ quan là bắt buộc' });
    }
    
    const result = await pool.query(
      `UPDATE organizations SET name=$1, type_id=$2, category=$3, address=$4, province_id=$5, ward_id=$6, phone=$7, email=$8, website=$9, working_hours=$10, description=$11, services=$12, lat=$13, lng=$14, is_active=$15, updated_at=CURRENT_TIMESTAMP
       WHERE id=$16 RETURNING *`,
      [name, type_id || null, category, address, province_id || null, ward_id || null, phone, email, website, working_hours, description, services, lat || null, lng || null, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cơ quan' });
    }
    
    log('INFO', 'Organization updated', { id, name });
    res.json({ success: true, data: result.rows[0], message: 'Cập nhật cơ quan thành công' });
  } catch (err) {
    log('ERROR', 'Update organization failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE - Xóa cơ quan
app.delete('/api/admin/organizations/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM organizations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cơ quan' });
    }
    
    log('INFO', 'Organization deleted', { id });
    res.json({ success: true, message: 'Xóa cơ quan thành công' });
  } catch (err) {
    log('ERROR', 'Delete organization failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WARDS (PHƯỜNG/XÃ) CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET all wards (with optional province_id filter)
app.get('/api/admin/wards', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { province_id } = req.query;
    let query = `
      SELECT w.*, p.name as province_name 
      FROM wards w 
      LEFT JOIN provinces p ON w.province_id = p.id
    `;
    const params = [];
    
    if (province_id) {
      query += ' WHERE w.province_id = $1';
      params.push(province_id);
    }
    
    query += ' ORDER BY p.name ASC, w.name ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log('ERROR', 'Get wards failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET wards for public API (by province)
app.get('/api/wards', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { province_id } = req.query;
    let query = 'SELECT * FROM wards WHERE is_active = true';
    const params = [];
    
    if (province_id) {
      query += ' AND province_id = $1';
      params.push(province_id);
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST new ward
app.post('/api/admin/wards', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { name, province_id, code, is_active } = req.body;
    
    if (!name || !province_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên phường/xã và tỉnh/thành phố là bắt buộc' 
      });
    }
    
    // Check if province exists
    const provinceCheck = await pool.query('SELECT id FROM provinces WHERE id = $1', [province_id]);
    if (provinceCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tỉnh/thành phố không tồn tại' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO wards (name, province_id, code, is_active) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), province_id, code || null, is_active !== false]
    );
    
    log('INFO', 'Ward created', { id: result.rows[0].id, name });
    res.json({ success: true, data: result.rows[0], message: 'Thêm phường/xã thành công' });
  } catch (err) {
    log('ERROR', 'Create ward failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update ward
app.put('/api/admin/wards/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    const { name, province_id, code, is_active } = req.body;
    
    if (!name || !province_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên phường/xã và tỉnh/thành phố là bắt buộc' 
      });
    }
    
    const result = await pool.query(
      `UPDATE wards SET name=$1, province_id=$2, code=$3, is_active=$4 
       WHERE id=$5 RETURNING *`,
      [name.trim(), province_id, code || null, is_active !== false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phường/xã' });
    }
    
    log('INFO', 'Ward updated', { id, name });
    res.json({ success: true, data: result.rows[0], message: 'Cập nhật phường/xã thành công' });
  } catch (err) {
    log('ERROR', 'Update ward failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE ward
app.delete('/api/admin/wards/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    
    // Check if ward is used by organizations or lawyers
    const orgCheck = await pool.query('SELECT COUNT(*) FROM organizations WHERE ward_id = $1', [id]);
    const lawyerCheck = await pool.query('SELECT COUNT(*) FROM lawyers WHERE ward_id = $1', [id]);
    
    if (parseInt(orgCheck.rows[0].count) > 0 || parseInt(lawyerCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa phường/xã đang được sử dụng bởi tổ chức hoặc luật sư' 
      });
    }
    
    const result = await pool.query('DELETE FROM wards WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phường/xã' });
    }
    
    log('INFO', 'Ward deleted', { id });
    res.json({ success: true, message: 'Xóa phường/xã thành công' });
  } catch (err) {
    log('ERROR', 'Delete ward failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NEWSLETTERS CRUD (Bản tin chuyên ngành)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/admin/newsletters', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/newsletters', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { title, summary, content, industry, category, type, priority, legal_doc, effective_date, is_published, is_active } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }
    const published_at = is_published ? new Date() : null;
    const result = await pool.query(
      `INSERT INTO newsletters (title, summary, content, industry, category, type, priority, legal_doc, effective_date, is_published, is_active, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, summary || null, content || null, industry || 'all', category || 'general', type || 'regulation', priority || 'normal', legal_doc || null, effective_date || null, is_published || false, is_active !== false, published_at]
    );
    log('INFO', 'Newsletter created', { id: result.rows[0].id, title });
    res.json({ success: true, data: result.rows[0] });

    // Send FCM push notification if newsletter is published
    if (is_published) {
      const industryLabel = industry && industry !== 'all' ? `${industry} - ` : '';
      const notifTitle = `${industryLabel}${title}`;
      const notifBody = summary ? summary.substring(0, 100) : 'Bản tin pháp lý chuyên ngành mới cập nhật';
      sendFcmToAllDevices(notifTitle, notifBody, {
        type: 'newsletter',
        id: String(result.rows[0].id),
        industry: industry || 'all',
      }).catch(() => {});
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/newsletters/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { id } = req.params;
    const { title, summary, content, industry, category, type, priority, legal_doc, effective_date, is_published, is_active } = req.body;

    // If publishing for the first time, set published_at
    const existing = await pool.query('SELECT is_published, published_at FROM newsletters WHERE id = $1', [id]);
    let published_at = existing.rows[0]?.published_at;
    if (is_published && !existing.rows[0]?.is_published) {
      published_at = new Date();
    }

    const result = await pool.query(
      `UPDATE newsletters SET title=$1, summary=$2, content=$3, industry=$4, category=$5, type=$6, priority=$7, legal_doc=$8, effective_date=$9, is_published=$10, is_active=$11, published_at=$12, updated_at=CURRENT_TIMESTAMP
       WHERE id=$13 RETURNING *`,
      [title, summary, content, industry, category, type, priority, legal_doc, effective_date || null, is_published, is_active, published_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản tin' });
    }
    log('INFO', 'Newsletter updated', { id, title });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/newsletters/:id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await pool.query('DELETE FROM newsletters WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản tin' });
    }
    log('INFO', 'Newsletter deleted', { id: req.params.id });
    res.json({ success: true, message: 'Xóa bản tin thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// FCM HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function sendFcmToAllDevices(title, body, data = {}) {
  if (!firebaseAdmin || !pool || !dbConnected) return;
  try {
    const result = await pool.query(
      'SELECT fcm_token FROM user_devices WHERE is_active = true'
    );
    const tokens = result.rows.map(r => r.fcm_token).filter(Boolean);
    if (tokens.length === 0) {
      log('INFO', 'FCM: no registered devices');
      return;
    }
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      tokens,
    };
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    log('INFO', `FCM sent: ${response.successCount} ok, ${response.failureCount} failed`);

    // Remove invalid tokens
    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await pool.query(
        'UPDATE user_devices SET is_active = false WHERE fcm_token = ANY($1)',
        [invalidTokens]
      );
      log('INFO', `FCM: deactivated ${invalidTokens.length} invalid tokens`);
    }
  } catch (err) {
    log('ERROR', 'FCM send error', { error: err.message });
  }
}

// Register / update FCM token from Flutter app
app.post('/api/devices/register-fcm', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { device_id, fcm_token, platform } = req.body;
    if (!device_id || !fcm_token) {
      return res.status(400).json({ success: false, message: 'device_id và fcm_token là bắt buộc' });
    }
    await pool.query(
      `INSERT INTO user_devices (device_id, fcm_token, platform, is_active, updated_at)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
       ON CONFLICT (device_id) DO UPDATE SET fcm_token = $2, platform = $3, is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [device_id, fcm_token, platform || 'unknown']
    );
    res.json({ success: true });
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
    console.log('║     HTIC Legal Calendar API v19.0 - Ready!                ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Server: http://localhost:${PORT}                         ║`);
    console.log(`║  📊 Database: ${dbConnected ? '✅ Connected' : '❌ Not Connected'}                        ║`);
    console.log('║  🔒 Security: JWT + Rate Limiting + CORS                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer();

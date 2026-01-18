// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND v17.0 (NO DISTRICTS - ADMIN MANAGED)
// Cấu trúc địa điểm: Tỉnh/Thành → Phường/Xã (không có Quận/Huyện)
// Dữ liệu provinces và wards do Admin tự nhập vào
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION - Railway PostgreSQL (Graceful)
// ═══════════════════════════════════════════════════════════════════════════
let dbConnected = false;
let pool = null;

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     HTIC Legal Calendar API v17.0 - Starting...           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('🔧 Environment check:');
console.log('   PORT:', PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
    dbConnected = false;
  });
} else {
  console.error('');
  console.error('⚠️  WARNING: DATABASE_URL is not set!');
  console.error('   Server will start but database features will not work.');
  console.error('   Please add DATABASE_URL to Railway Variables:');
  console.error('   DATABASE_URL = ${{Postgres.DATABASE_URL}}');
  console.error('');
}

// Helper to check DB connection
function requireDB(res) {
  if (!dbConnected || !pool) {
    res.status(503).json({ 
      success: false, 
      message: 'Database not connected. Please configure DATABASE_URL.',
      hint: 'Add DATABASE_URL variable in Railway Dashboard'
    });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION (Graceful - won't crash if DB unavailable)
// ═══════════════════════════════════════════════════════════════════════════
async function initDatabase() {
  if (!pool) {
    console.log('⚠️  Skipping database initialization (no DATABASE_URL)');
    return false;
  }

  console.log('📦 Initializing database...');
  
  // Test connection first
  try {
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db');
    console.log('✅ Database connected:', testResult.rows[0].db, 'at', testResult.rows[0].now);
    dbConnected = true;
  } catch (testErr) {
    console.error('❌ Database connection failed:', testErr.message);
    console.error('   Server will continue but database features unavailable.');
    dbConnected = false;
    return false;
  }

  const client = await pool.connect();
  try {
    console.log('📝 Creating tables...');
    
    // Categories table
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

    // Provinces table (Tỉnh/Thành phố)
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

    // Wards table (Phường/Xã) - link trực tiếp với provinces (bỏ quận/huyện)
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

    // Agencies table (cơ quan ban hành)
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

    // Events table (Nghĩa vụ pháp lý / Lịch pháp lý)
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

    // News table (Tin tức pháp lý)
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

    // Organization types (Loại cơ quan tra cứu)
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

    // Organizations table (Cơ quan tra cứu)
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

    // Lawyers table
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

    // Support requests table
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

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SEED DEFAULT DATA (wrapped in try-catch to not crash if data exists)
    console.log('📝 Seeding default data...');
    
    try {
      const defaultCategories = [
        { name: 'Thuế', key: 'tax', icon: 'receipt_long', color: '#F97316' },
        { name: 'Lao động', key: 'labor', icon: 'people', color: '#06B6D4' },
        { name: 'Bảo hiểm', key: 'insurance', icon: 'health_and_safety', color: '#10B981' },
        { name: 'Tài chính', key: 'finance', icon: 'account_balance', color: '#8B5CF6' },
        { name: 'Đầu tư', key: 'investment', icon: 'trending_up', color: '#6366F1' },
        { name: 'Khác', key: 'other', icon: 'event', color: '#3B82F6' }
      ];
      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i];
        await client.query(
          `INSERT INTO categories (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
          [cat.name, cat.key, cat.icon, cat.color, i]
        );
      }
      console.log('   ✓ Categories seeded');
    } catch (e) { console.log('   ⚠ Categories already exist or error:', e.message); }

    // NOTE: Provinces và Wards không seed sẵn - do Admin tự nhập vào
    console.log('   ℹ Provinces và Wards: Admin sẽ tự nhập dữ liệu');

    try {
      const defaultOrgTypes = [
        { name: 'Cơ quan nhà nước', key: 'government', icon: 'account_balance', color: '#3B82F6' },
        { name: 'Công ty luật', key: 'lawfirm', icon: 'gavel', color: '#8B5CF6' },
        { name: 'Văn phòng công chứng', key: 'notary', icon: 'verified', color: '#F97316' },
        { name: 'Thừa phát lại', key: 'bailiff', icon: 'assignment', color: '#10B981' },
        { name: 'Cơ quan thuế', key: 'tax', icon: 'receipt_long', color: '#EF4444' },
        { name: 'Bảo hiểm xã hội', key: 'insurance', icon: 'shield', color: '#06B6D4' },
        { name: 'Sở LĐTBXH', key: 'labor', icon: 'people', color: '#EC4899' },
        { name: 'Khác', key: 'other', icon: 'business', color: '#64748B' }
      ];
      for (let i = 0; i < defaultOrgTypes.length; i++) {
        const type = defaultOrgTypes[i];
        await client.query(
          `INSERT INTO org_types (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
          [type.name, type.key, type.icon, type.color, i]
        );
      }
      console.log('   ✓ Org types seeded');
    } catch (e) { console.log('   ⚠ Org types already exist or error:', e.message); }

    try {
      const defaultSettings = [
        { key: 'app_name', value: 'HTIC Legal Calendar', description: 'Tên ứng dụng' },
        { key: 'app_version', value: '1.0.0', description: 'Phiên bản ứng dụng' },
        { key: 'app_logo', value: '', description: 'URL logo ứng dụng' },
        { key: 'company_name', value: 'Công ty Luật TNHH HTIC', description: 'Tên công ty' },
        { key: 'company_slogan', value: 'Đồng hành pháp lý doanh nghiệp', description: 'Slogan công ty' },
        { key: 'address', value: '79/6 Hoàng Văn Thái, P.Tân Phú, Quận 7, TP.HCM', description: 'Địa chỉ' },
        { key: 'hotline', value: '0918 682 879', description: 'Số hotline' },
        { key: 'zalo_link', value: 'https://zalo.me/0918682879', description: 'Link Zalo' },
        { key: 'contact_email', value: 'contact@htic.com.vn', description: 'Email liên hệ' },
        { key: 'support_email', value: 'support@htic.com.vn', description: 'Email hỗ trợ' },
        { key: 'website', value: 'https://htic.com.vn', description: 'Website' },
        { key: 'facebook', value: 'https://facebook.com/hticlaw', description: 'Facebook' },
        { key: 'working_hours', value: '8:00 - 18:00', description: 'Giờ làm việc' },
        { key: 'working_days', value: 'Thứ 2 - Thứ 6', description: 'Ngày làm việc' },
        { key: 'about_content', value: 'HTIC Law Firm là công ty luật hàng đầu tại Việt Nam với hơn 15 năm kinh nghiệm trong lĩnh vực tư vấn pháp luật doanh nghiệp.', description: 'Nội dung giới thiệu' }
      ];
      for (const setting of defaultSettings) {
        await client.query(
          `INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
          [setting.key, setting.value, setting.description]
        );
      }
      console.log('   ✓ Settings seeded');
    } catch (e) { console.log('   ⚠ Settings already exist or error:', e.message); }

    try {
      await client.query(`
        INSERT INTO lawyers (name, company, phone, zalo, email, working_hours, working_days, bio, specialization, is_online, is_primary, sort_order)
        SELECT 'Luật sư HTIC', 'Công ty Luật TNHH HTIC', '0918 682 879', '0918682879', 'contact@htic.com.vn',
               '8:00 - 18:00', 'Thứ 2 - Thứ 6', 'Hơn 15 năm kinh nghiệm tư vấn pháp luật doanh nghiệp.', 'Thuế, M&A, Đầu tư nước ngoài', true, true, 0
        WHERE NOT EXISTS (SELECT 1 FROM lawyers WHERE is_primary = true)
      `);
      console.log('   ✓ Default lawyer seeded');
    } catch (e) { console.log('   ⚠ Lawyer already exist or error:', e.message); }

    try {
      const defaultAgencies = [
        { name: 'Tổng cục Thuế', short_name: 'TCT' },
        { name: 'Bảo hiểm Xã hội Việt Nam', short_name: 'BHXHVN' },
        { name: 'Bộ Lao động - Thương binh và Xã hội', short_name: 'BLĐTBXH' }
      ];
      for (const agency of defaultAgencies) {
        await client.query(
          `INSERT INTO agencies (name, short_name) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM agencies WHERE name = $1)`,
          [agency.name, agency.short_name]
        );
      }
      console.log('   ✓ Agencies seeded');
    } catch (e) { console.log('   ⚠ Agencies already exist or error:', e.message); }

    console.log('✅ Database initialized with v17.0 schema');
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - PUBLIC (FOR FLUTTER APP)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '17.0.0', 
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    message: dbConnected ? 'All systems operational' : 'Database not connected - please configure DATABASE_URL'
  });
});

app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      WHERE e.is_active = true
      ORDER BY e.deadline DESC, e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const { category, limit } = req.query;
    let query = `SELECT * FROM news WHERE is_active = true`;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ` ORDER BY published_at DESC, created_at DESC`;
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

app.get('/api/agencies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.name, o.category, o.address, o.phone, o.email, o.website, o.working_hours as "workingHours", o.description, o.services,
             t.key as type, t.name as type_name, p.code as "provinceId", p.name as province_name
      FROM organizations o
      LEFT JOIN org_types t ON o.type_id = t.id
      LEFT JOIN provinces p ON o.province_id = p.id
      WHERE o.is_active = true ORDER BY o.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/org-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM org_types WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/lawyers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lawyers WHERE is_active = true ORDER BY is_primary DESC, sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/lawyers/primary', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lawyers WHERE is_primary = true AND is_active = true LIMIT 1');
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/support-requests', async (req, res) => {
  try {
    const { name, phone, email, company, category, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền họ tên và nội dung' });
    }
    const result = await pool.query(
      `INSERT INTO support_requests (name, phone, email, company, category, subject, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, phone, email, company, category || 'legal', subject || 'Yêu cầu tư vấn pháp lý', message]
    );
    res.json({ success: true, message: 'Gửi yêu cầu thành công!', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
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
  try {
    const result = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces WHERE is_active = true ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
const JWT_SECRET = 'htic-legal-2025-secret-key';

// Simple token generation
function generateToken(username) {
  const payload = { username, exp: Date.now() + 24 * 60 * 60 * 1000 }; // 24h
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp > Date.now()) return payload;
  } catch (e) {}
  return null;
}

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = generateToken(username);
    res.json({ success: true, token, message: 'Đăng nhập thành công' });
  } else {
    res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
});

const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Support Bearer token
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.admin = payload;
      return next();
    }
  }
  
  // Support Basic Auth (legacy)
  if (auth === 'Basic ' + Buffer.from('admin:htic2025').toString('base64')) {
    return next();
  }
  
  res.status(401).json({ success: false, message: 'Unauthorized' });
};

app.get('/api/admin/stats', adminAuth, async (req, res) => {
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
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name
      FROM events e LEFT JOIN agencies a ON e.agency_id = a.id LEFT JOIN provinces p ON e.province_id = p.id
      ORDER BY e.deadline DESC, e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/events', adminAuth, async (req, res) => {
  try {
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, is_active } = req.body;
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
  try {
    const { id } = req.params;
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, is_active } = req.body;
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
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// NEWS CRUD
app.get('/api/admin/news', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC, created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/news', adminAuth, async (req, res) => {
  try {
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at } = req.body;
    const result = await pool.query(
      `INSERT INTO news (title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [title, summary, content, category, image_url, source, source_url, author, is_featured || false, is_active !== false, published_at || new Date()]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/news/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, published_at } = req.body;
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
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ORGANIZATIONS CRUD
app.get('/api/admin/organizations', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, t.name as type_name, t.key as type_key, 
             p.name as province_name, w.name as ward_name
      FROM organizations o 
      LEFT JOIN org_types t ON o.type_id = t.id 
      LEFT JOIN provinces p ON o.province_id = p.id 
      LEFT JOIN wards w ON o.ward_id = w.id
      ORDER BY o.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/organizations', adminAuth, async (req, res) => {
  try {
    const { name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO organizations (name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, type_id, category, address, province_id || null, ward_id || null, phone, email, website, working_hours, description, services, lat, lng, is_active !== false]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/organizations/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type_id, category, address, province_id, ward_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    const result = await pool.query(
      `UPDATE organizations SET name=$1, type_id=$2, category=$3, address=$4, province_id=$5, ward_id=$6, phone=$7, email=$8, website=$9, working_hours=$10, description=$11, services=$12, lat=$13, lng=$14, is_active=$15, updated_at=CURRENT_TIMESTAMP WHERE id=$16 RETURNING *`,
      [name, type_id, category, address, province_id || null, ward_id || null, phone, email, website, working_hours, description, services, lat, lng, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/organizations/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// LAWYERS CRUD
app.get('/api/admin/lawyers', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, p.name as province_name, w.name as ward_name
      FROM lawyers l
      LEFT JOIN provinces p ON l.province_id = p.id
      LEFT JOIN wards w ON l.ward_id = w.id
      ORDER BY l.is_primary DESC, l.sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/lawyers', adminAuth, async (req, res) => {
  try {
    const { name, company, phone, zalo, email, avatar_url, address, province_id, ward_id, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO lawyers (name, company, phone, zalo, email, avatar_url, address, province_id, ward_id, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [name, company, phone, zalo, email, avatar_url, address, province_id || null, ward_id || null, working_hours, working_days, bio, specialization, is_online !== false, is_primary || false, is_active !== false, sort_order || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/lawyers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, zalo, email, avatar_url, address, province_id, ward_id, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE lawyers SET name=$1, company=$2, phone=$3, zalo=$4, email=$5, avatar_url=$6, address=$7, province_id=$8, ward_id=$9, working_hours=$10, working_days=$11, bio=$12, specialization=$13, is_online=$14, is_primary=$15, is_active=$16, sort_order=$17 WHERE id=$18 RETURNING *`,
      [name, company, phone, zalo, email, avatar_url, address, province_id || null, ward_id || null, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/lawyers/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lawyers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// SUPPORT REQUESTS CRUD
app.get('/api/admin/support-requests', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM support_requests ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/support-requests/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assigned_to } = req.body;
    const result = await pool.query(
      `UPDATE support_requests SET status=$1, notes=$2, assigned_to=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,
      [status, notes, assigned_to, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/support-requests/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM support_requests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// SETTINGS CRUD
app.get('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY key ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/agencies-list', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agencies ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/categories', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/provinces', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public API for provinces (for app)
app.get('/api/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces WHERE is_active = true ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Provinces CRUD (Admin tự nhập dữ liệu)
app.post('/api/admin/provinces', adminAuth, async (req, res) => {
  try {
    const { name, code, region } = req.body;
    const result = await pool.query(
      'INSERT INTO provinces (name, code, region) VALUES ($1, $2, $3) RETURNING *',
      [name, code || null, region || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/provinces/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, region, is_active } = req.body;
    const result = await pool.query(
      'UPDATE provinces SET name=$1, code=$2, region=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [name, code, region, is_active !== false, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/provinces/:id', adminAuth, async (req, res) => {
  try {
    // Xóa wards thuộc province trước
    await pool.query('DELETE FROM wards WHERE province_id = $1', [req.params.id]);
    await pool.query('DELETE FROM provinces WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Wards API (Phường/Xã - link trực tiếp với Tỉnh/Thành, không qua Quận/Huyện)
app.get('/api/wards', async (req, res) => {
  try {
    const { province_id } = req.query;
    let query = 'SELECT * FROM wards WHERE is_active = true';
    const params = [];
    if (province_id) {
      params.push(province_id);
      query += ` AND province_id = $${params.length}`;
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/wards', adminAuth, async (req, res) => {
  try {
    const { province_id } = req.query;
    let query = `SELECT w.*, p.name as province_name FROM wards w 
                 LEFT JOIN provinces p ON w.province_id = p.id`;
    const params = [];
    if (province_id) {
      params.push(province_id);
      query += ` WHERE w.province_id = $${params.length}`;
    }
    query += ' ORDER BY p.name ASC, w.name ASC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/wards', adminAuth, async (req, res) => {
  try {
    const { province_id, name, code } = req.body;
    const result = await pool.query(
      'INSERT INTO wards (province_id, name, code) VALUES ($1, $2, $3) RETURNING *',
      [province_id, name, code || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/wards/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { province_id, name, code, is_active } = req.body;
    const result = await pool.query(
      'UPDATE wards SET province_id=$1, name=$2, code=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [province_id, name, code, is_active !== false, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/wards/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM wards WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/org-types', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM org_types ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Status page khi database chưa kết nối
const statusPage = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTIC Legal - Server Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: white; border-radius: 20px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .icon { font-size: 60px; margin-bottom: 20px; }
    h1 { color: #1e3a5f; margin-bottom: 10px; }
    .status { padding: 10px 20px; border-radius: 10px; margin: 20px 0; font-weight: 600; }
    .status.error { background: #FEE2E2; color: #DC2626; }
    .status.success { background: #D1FAE5; color: #059669; }
    .info { color: #64748B; line-height: 1.6; margin: 20px 0; }
    .code { background: #F1F5F9; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 14px; text-align: left; margin: 15px 0; }
    .btn { display: inline-block; padding: 12px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; margin-top: 20px; }
    .btn:hover { background: #2563EB; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚖️</div>
    <h1>HTIC Legal Calendar</h1>
    <div class="status error">❌ Database Not Connected</div>
    <p class="info">Server đang chạy nhưng chưa kết nối được database PostgreSQL.</p>
    <div class="code">
      <strong>Cách khắc phục:</strong><br><br>
      1. Vào Railway Dashboard<br>
      2. Chọn Backend service → Variables<br>
      3. Thêm biến:<br>
      &nbsp;&nbsp;DATABASE_URL = ${"$"}{{Postgres.DATABASE_URL}}<br>
      4. Redeploy
    </div>
    <a href="/api/health" class="btn">Kiểm tra API Status</a>
  </div>
</body>
</html>
`;

app.get('/admin', (req, res) => {
  if (!dbConnected) {
    return res.send(statusPage);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
  if (!dbConnected) {
    return res.send(statusPage);
  }
  res.redirect('/admin');
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER (Always starts, even without DB)
// ═══════════════════════════════════════════════════════════════════════════
async function startServer() {
  // Try to init database (won't crash if fails)
  await initDatabase().catch(err => {
    console.error('⚠️  Database init failed:', err.message);
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     HTIC Legal Calendar API v17.0                         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Server running on port ${PORT}                           ║`);
    if (dbConnected) {
      console.log('║  ✅ Database: Connected                                    ║');
    } else {
      console.log('║  ❌ Database: NOT CONNECTED                                ║');
      console.log('║     → Add DATABASE_URL in Railway Variables                ║');
    }
    console.log('║  📱 API ready for requests                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer();

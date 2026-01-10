// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND v14.1 (FIX MIGRATION)
// Railway PostgreSQL + Express.js
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

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE MIGRATION - CHECK AND FIX SCHEMA CONFLICTS
// ═══════════════════════════════════════════════════════════════════════════
async function migrateDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if provinces table exists and has VARCHAR id (old schema)
    const checkProvinces = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'provinces' AND column_name = 'id'
    `);
    
    if (checkProvinces.rows.length > 0 && checkProvinces.rows[0].data_type === 'character varying') {
      console.log('⚠️ Detected old schema with VARCHAR IDs. Starting migration...');
      
      // Drop tables in correct order (reverse dependency order)
      const tablesToDrop = [
        'organizations', 'events', 'news', 'lawyers', 'support_requests', 
        'settings', 'org_types', 'agencies', 'provinces', 'categories', 'admin_users'
      ];
      
      for (const table of tablesToDrop) {
        try {
          await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
          console.log(`  ✓ Dropped table: ${table}`);
        } catch (e) {
          console.log(`  - Table ${table} not found or already dropped`);
        }
      }
      
      console.log('✅ Old tables dropped. Will recreate with new schema.');
    } else {
      console.log('✅ Schema is compatible or database is empty.');
    }
  } catch (err) {
    console.log('⚠️ Migration check error (non-fatal):', err.message);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
async function initDatabase() {
  // Run migration check first
  await migrateDatabase();
  
  const client = await pool.connect();
  try {
    // Admin users table (create first, no dependencies)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Provinces table
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
        agency_id INT REFERENCES agencies(id) ON DELETE SET NULL,
        province_id INT REFERENCES provinces(id) ON DELETE SET NULL,
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
        type_id INT REFERENCES org_types(id) ON DELETE SET NULL,
        category VARCHAR(50) DEFAULT 'government',
        address TEXT,
        district VARCHAR(100),
        province_id INT REFERENCES provinces(id) ON DELETE SET NULL,
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
        title VARCHAR(100),
        company VARCHAR(255),
        phone VARCHAR(50),
        zalo VARCHAR(50),
        email VARCHAR(100),
        avatar_url TEXT,
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

    // SEED DEFAULT DATA
    // Default admin user
    const bcrypt = require('bcryptjs');
    const adminExists = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('htic2025', 10);
      await client.query(
        "INSERT INTO admin_users (username, password) VALUES ('admin', $1)",
        [hashedPassword]
      );
      console.log('✅ Default admin user created');
    }

    const defaultCategories = [
      { name: 'Thuế', key: 'tax', icon: 'receipt_long', color: '#F97316' },
      { name: 'Lao động', key: 'labor', icon: 'people', color: '#06B6D4' },
      { name: 'Bảo hiểm', key: 'insurance', icon: 'health_and_safety', color: '#10B981' },
      { name: 'Tài chính', key: 'finance', icon: 'account_balance', color: '#8B5CF6' },
      { name: 'Đầu tư', key: 'investment', icon: 'trending_up', color: '#6366F1' },
      { name: 'Khác', key: 'other', icon: 'event', color: '#3B82F6' }
    ];
    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
        [cat.name, cat.key, cat.icon, cat.color, defaultCategories.indexOf(cat)]
      );
    }

    const defaultProvinces = [
      { name: 'TP. Hồ Chí Minh', code: 'hcm', region: 'south' },
      { name: 'Hà Nội', code: 'hanoi', region: 'north' },
      { name: 'Đà Nẵng', code: 'danang', region: 'central' },
      { name: 'Bình Dương', code: 'binhduong', region: 'south' },
      { name: 'Đồng Nai', code: 'dongnai', region: 'south' }
    ];
    for (const prov of defaultProvinces) {
      await client.query(
        `INSERT INTO provinces (name, code, region) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
        [prov.name, prov.code, prov.region]
      );
    }

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
    for (const type of defaultOrgTypes) {
      await client.query(
        `INSERT INTO org_types (name, key, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
        [type.name, type.key, type.icon, type.color, defaultOrgTypes.indexOf(type)]
      );
    }

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

    await client.query(`
      INSERT INTO lawyers (name, title, company, phone, zalo, email, working_hours, working_days, bio, specialization, is_online, is_primary, sort_order)
      SELECT 'Luật sư HTIC', 'Luật sư điều hành', 'Công ty Luật TNHH HTIC', '0918 682 879', '0918682879', 'contact@htic.com.vn',
             '8:00 - 18:00', 'Thứ 2 - Thứ 6', 'Hơn 15 năm kinh nghiệm tư vấn pháp luật doanh nghiệp.', 'Thuế, M&A, Đầu tư nước ngoài', true, true, 0
      WHERE NOT EXISTS (SELECT 1 FROM lawyers WHERE is_primary = true)
    `);

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

    console.log('✅ Database initialized with v14.1 schema');
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════
const bcrypt = require('bcryptjs');

const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header' });
  }
  const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - PUBLIC (FOR FLUTTER APP)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '14.1.0', timestamp: new Date().toISOString() });
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
      query += ` AND (o.name ILIKE $${params.length} OR o.address ILIKE $${params.length} OR o.services ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.name ASC`;
    const result = await pool.query(query, params);
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

app.get('/api/org-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM org_types WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
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

app.post('/api/support-request', async (req, res) => {
  try {
    const { name, phone, email, company, category, subject, message } = req.body;
    const result = await pool.query(
      `INSERT INTO support_requests (name, phone, email, company, category, subject, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, phone, email, company, category || 'legal', subject, message]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN (PROTECTED)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, user: { id: result.rows[0].id, username: result.rows[0].username } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dashboard stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const events = await pool.query('SELECT COUNT(*) FROM events WHERE is_active = true');
    const news = await pool.query('SELECT COUNT(*) FROM news WHERE is_active = true');
    const orgs = await pool.query('SELECT COUNT(*) FROM organizations WHERE is_active = true');
    const requests = await pool.query("SELECT COUNT(*) FROM support_requests WHERE status = 'pending'");
    res.json({
      success: true,
      data: {
        events: parseInt(events.rows[0].count),
        news: parseInt(news.rows[0].count),
        organizations: parseInt(orgs.rows[0].count),
        pendingRequests: parseInt(requests.rows[0].count)
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
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      ORDER BY e.created_at DESC
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
      [title, description, category, deadline || null, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days || 7, notes, source, source_url, is_active !== false]
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
      [title, description, category, deadline || null, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days, notes, source, source_url, is_active, id]
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
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/news', adminAuth, async (req, res) => {
  try {
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO news (title, summary, content, category, image_url, source, source_url, author, is_featured, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, summary, content, category, image_url, source, source_url, author, is_featured || false, is_active !== false]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/news/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category, image_url, source, source_url, author, is_featured, is_active } = req.body;
    const result = await pool.query(
      `UPDATE news SET title=$1, summary=$2, content=$3, category=$4, image_url=$5, source=$6, source_url=$7, author=$8, is_featured=$9, is_active=$10, updated_at=CURRENT_TIMESTAMP WHERE id=$11 RETURNING *`,
      [title, summary, content, category, image_url, source, source_url, author, is_featured, is_active, id]
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
      SELECT o.*, t.name as type_name, t.key as type_key, p.name as province_name
      FROM organizations o LEFT JOIN org_types t ON o.type_id = t.id LEFT JOIN provinces p ON o.province_id = p.id ORDER BY o.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/organizations', adminAuth, async (req, res) => {
  try {
    const { name, type_id, category, address, district, province_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO organizations (name, type_id, category, address, district, province_id, phone, email, website, working_hours, description, services, lat, lng, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, type_id, category, address, district, province_id || null, phone, email, website, working_hours, description, services, lat, lng, is_active !== false]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/organizations/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type_id, category, address, district, province_id, phone, email, website, working_hours, description, services, lat, lng, is_active } = req.body;
    const result = await pool.query(
      `UPDATE organizations SET name=$1, type_id=$2, category=$3, address=$4, district=$5, province_id=$6, phone=$7, email=$8, website=$9, working_hours=$10, description=$11, services=$12, lat=$13, lng=$14, is_active=$15, updated_at=CURRENT_TIMESTAMP WHERE id=$16 RETURNING *`,
      [name, type_id, category, address, district, province_id || null, phone, email, website, working_hours, description, services, lat, lng, is_active, id]
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
    const result = await pool.query('SELECT * FROM lawyers ORDER BY is_primary DESC, sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/lawyers', adminAuth, async (req, res) => {
  try {
    const { name, title, company, phone, zalo, email, avatar_url, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO lawyers (name, title, company, phone, zalo, email, avatar_url, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, title, company, phone, zalo, email, avatar_url, working_hours, working_days, bio, specialization, is_online !== false, is_primary || false, is_active !== false, sort_order || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/lawyers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, company, phone, zalo, email, avatar_url, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE lawyers SET name=$1, title=$2, company=$3, phone=$4, zalo=$5, email=$6, avatar_url=$7, working_hours=$8, working_days=$9, bio=$10, specialization=$11, is_online=$12, is_primary=$13, is_active=$14, sort_order=$15 WHERE id=$16 RETURNING *`,
      [name, title, company, phone, zalo, email, avatar_url, working_hours, working_days, bio, specialization, is_online, is_primary, is_active, sort_order, id]
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

app.get('/api/admin/org-types', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM org_types ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 HTIC Legal Calendar API v14.1 running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

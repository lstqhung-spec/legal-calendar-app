// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND SERVER v11.0 (PostgreSQL Edition)
// Railway Deployment with PostgreSQL Database
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT
      );

      -- Admin users table
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Agencies table (Cơ quan ban hành)
      CREATE TABLE IF NOT EXISTS agencies (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Provinces table (Tỉnh/Thành phố)
      CREATE TABLE IF NOT EXISTS provinces (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Events/Obligations table (Nghĩa vụ pháp lý)
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        deadline VARCHAR(100),
        frequency VARCHAR(100),
        legal_base TEXT,
        penalty TEXT,
        agency_id VARCHAR(50),
        province_id VARCHAR(50),
        applies_to TEXT,
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- News table (Tin tức pháp luật)
      CREATE TABLE IF NOT EXISTS news (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        content TEXT,
        date VARCHAR(50),
        source VARCHAR(255),
        url TEXT,
        image_url TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default admin if not exists
    const adminExists = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('htic2025', 10);
      await client.query(
        "INSERT INTO admin_users (username, password) VALUES ('admin', $1)",
        [hashedPassword]
      );
      console.log('✅ Default admin user created');
    }

    // Insert default settings if not exists
    const settingsExists = await client.query("SELECT * FROM settings WHERE key = 'app_name'");
    if (settingsExists.rows.length === 0) {
      await client.query(`
        INSERT INTO settings (key, value) VALUES 
        ('app_name', 'HTIC Legal Calendar'),
        ('app_version', '1.0.0'),
        ('contact_email', 'contact@htic.com.vn'),
        ('contact_phone', '0918682879')
        ON CONFLICT (key) DO NOTHING
      `);
      console.log('✅ Default settings created');
    }

    // Insert sample agencies if empty
    const agenciesCount = await client.query("SELECT COUNT(*) FROM agencies");
    if (parseInt(agenciesCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO agencies (id, name) VALUES 
        ('BTC', 'Bộ Tài chính'),
        ('BHXH', 'Bảo hiểm xã hội'),
        ('TCT', 'Tổng cục Thuế'),
        ('BCA', 'Bộ Công an'),
        ('BLDTBXH', 'Bộ Lao động - Thương binh và Xã hội'),
        ('DKKD', 'Sở Kế hoạch và Đầu tư')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Sample agencies created');
    }

    // Insert sample provinces if empty
    const provincesCount = await client.query("SELECT COUNT(*) FROM provinces");
    if (parseInt(provincesCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO provinces (id, name) VALUES 
        ('ALL', 'Toàn quốc'),
        ('HCM', 'TP. Hồ Chí Minh'),
        ('HN', 'Hà Nội'),
        ('DN', 'Đà Nẵng'),
        ('BD', 'Bình Dương'),
        ('HP', 'Hải Phòng')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Sample provinces created');
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function parseVietnameseDate(dateStr) {
  if (!dateStr) return new Date(0);
  // Handle dd/mm/yyyy format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // Handle ISO format
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'HTIC Legal Calendar API v11.0 (PostgreSQL)',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'PostgreSQL', version: '11.0' });
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all events/obligations (for app)
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name 
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all news (for app) - sorted by date (newest first)
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    // Sort by Vietnamese date format
    const sortedNews = result.rows.sort((a, b) => {
      const dateA = parseVietnameseDate(a.date);
      const dateB = parseVietnameseDate(b.date);
      return dateB - dateA;
    });
    res.json(sortedNews);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agencies (for app)
app.get('/api/agencies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching agencies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get provinces (for app)
app.get('/api/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching provinces:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });
    }

    res.json({ 
      success: true, 
      message: 'Đăng nhập thành công',
      user: { username: user.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Change password
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password = $1 WHERE username = $2', [hashedNewPassword, username]);

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN EVENTS (CRUD)
// ═══════════════════════════════════════════════════════════════════════════

// Get all events (admin)
app.get('/api/admin/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name 
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
app.post('/api/admin/events', async (req, res) => {
  try {
    const { title, description, deadline, frequency, legal_base, penalty, agency_id, province_id, applies_to, priority, category } = req.body;
    const id = generateId('evt');
    
    await pool.query(`
      INSERT INTO events (id, title, description, deadline, frequency, legal_base, penalty, agency_id, province_id, applies_to, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [id, title, description, deadline, frequency, legal_base, penalty, agency_id, province_id, applies_to, priority || 'medium', category]);
    
    res.json({ success: true, message: 'Tạo nghĩa vụ thành công', id });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Update event
app.put('/api/admin/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, frequency, legal_base, penalty, agency_id, province_id, applies_to, priority, category } = req.body;
    
    await pool.query(`
      UPDATE events SET 
        title = $1, description = $2, deadline = $3, frequency = $4, legal_base = $5, 
        penalty = $6, agency_id = $7, province_id = $8, applies_to = $9, priority = $10, 
        category = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
    `, [title, description, deadline, frequency, legal_base, penalty, agency_id, province_id, applies_to, priority, category, id]);
    
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Delete event
app.delete('/api/admin/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN NEWS (CRUD)
// ═══════════════════════════════════════════════════════════════════════════

// Get all news (admin)
app.get('/api/admin/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    const sortedNews = result.rows.sort((a, b) => {
      const dateA = parseVietnameseDate(a.date);
      const dateB = parseVietnameseDate(b.date);
      return dateB - dateA;
    });
    res.json(sortedNews);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create news
app.post('/api/admin/news', async (req, res) => {
  try {
    const { title, summary, content, date, source, url, image_url, category } = req.body;
    const id = generateId('news');
    
    await pool.query(`
      INSERT INTO news (id, title, summary, content, date, source, url, image_url, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, title, summary, content, date, source, url, image_url, category]);
    
    res.json({ success: true, message: 'Tạo tin tức thành công', id });
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Update news
app.put('/api/admin/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, date, source, url, image_url, category } = req.body;
    
    await pool.query(`
      UPDATE news SET 
        title = $1, summary = $2, content = $3, date = $4, source = $5, 
        url = $6, image_url = $7, category = $8
      WHERE id = $9
    `, [title, summary, content, date, source, url, image_url, category, id]);
    
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Delete news
app.delete('/api/admin/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM news WHERE id = $1', [id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN AGENCIES (CRUD)
// ═══════════════════════════════════════════════════════════════════════════

// Get all agencies (admin)
app.get('/api/admin/agencies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching agencies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create agency
app.post('/api/admin/agencies', async (req, res) => {
  try {
    const { id, name } = req.body;
    const agencyId = id || name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
    
    await pool.query('INSERT INTO agencies (id, name) VALUES ($1, $2)', [agencyId, name]);
    res.json({ success: true, message: 'Tạo cơ quan thành công', id: agencyId });
  } catch (err) {
    console.error('Error creating agency:', err);
    res.status(500).json({ success: false, message: 'Lỗi server hoặc ID đã tồn tại' });
  }
});

// Update agency
app.put('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    await pool.query('UPDATE agencies SET name = $1 WHERE id = $2', [name, id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error updating agency:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Delete agency
app.delete('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM agencies WHERE id = $1', [id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error deleting agency:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN PROVINCES (CRUD)
// ═══════════════════════════════════════════════════════════════════════════

// Get all provinces (admin)
app.get('/api/admin/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching provinces:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create province
app.post('/api/admin/provinces', async (req, res) => {
  try {
    const { id, name } = req.body;
    const provinceId = id || name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
    
    await pool.query('INSERT INTO provinces (id, name) VALUES ($1, $2)', [provinceId, name]);
    res.json({ success: true, message: 'Tạo tỉnh/thành phố thành công', id: provinceId });
  } catch (err) {
    console.error('Error creating province:', err);
    res.status(500).json({ success: false, message: 'Lỗi server hoặc ID đã tồn tại' });
  }
});

// Update province
app.put('/api/admin/provinces/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    await pool.query('UPDATE provinces SET name = $1 WHERE id = $2', [name, id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error updating province:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Delete province
app.delete('/api/admin/provinces/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM provinces WHERE id = $1', [id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error deleting province:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - ADMIN SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

app.put('/api/admin/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2
      `, [key, value]);
    }
    
    res.json({ success: true, message: 'Cập nhật cài đặt thành công' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES - STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/admin/stats', async (req, res) => {
  try {
    const eventsCount = await pool.query('SELECT COUNT(*) FROM events');
    const newsCount = await pool.query('SELECT COUNT(*) FROM news');
    const agenciesCount = await pool.query('SELECT COUNT(*) FROM agencies');
    const provincesCount = await pool.query('SELECT COUNT(*) FROM provinces');
    
    res.json({
      events: parseInt(eventsCount.rows[0].count),
      news: parseInt(newsCount.rows[0].count),
      agencies: parseInt(agenciesCount.rows[0].count),
      provinces: parseInt(provincesCount.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Version: 11.0 (PostgreSQL Edition)`);
  console.log(`🔗 Database: PostgreSQL`);
  
  // Initialize database tables
  await initializeDatabase();
});

// ═══════════════════════════════════════════════════════════════════════════
// HTIC LEGAL CALENDAR - BACKEND SERVER v12.0 (Full Features)
// Railway Deployment with PostgreSQL Database
// Synced with Flutter App Data Structure
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

      -- Categories table (Danh mục)
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Agencies table (Cơ quan ban hành)
      CREATE TABLE IF NOT EXISTS agencies (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Provinces table (Tỉnh/Thành phố)
      CREATE TABLE IF NOT EXISTS provinces (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Events/Obligations table (Nghĩa vụ pháp lý)
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        deadline VARCHAR(100),
        date VARCHAR(100),
        frequency VARCHAR(100),
        legal_basis TEXT,
        penalty TEXT,
        agency_id VARCHAR(50),
        province_id VARCHAR(50),
        applies_to VARCHAR(50) DEFAULT 'all',
        priority VARCHAR(20) DEFAULT 'medium',
        reminder_days INTEGER DEFAULT 7,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- News table (Tin tức pháp luật)
      CREATE TABLE IF NOT EXISTS news (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        content TEXT,
        category VARCHAR(50),
        date VARCHAR(100),
        source VARCHAR(255),
        source_url TEXT,
        image_url TEXT,
        is_featured BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notifications table (Thông báo)
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        link TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default admin
    const adminExists = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('htic2025', 10);
      await client.query("INSERT INTO admin_users (username, password) VALUES ('admin', $1)", [hashedPassword]);
      console.log('✅ Default admin created');
    }

    // Insert default categories
    const catCount = await client.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categories (id, name, icon, color) VALUES 
        ('tax', 'Thuế', 'receipt_long', '#F97316'),
        ('insurance', 'Bảo hiểm', 'health_and_safety', '#10B981'),
        ('labor', 'Lao động', 'people', '#06B6D4'),
        ('finance', 'Tài chính', 'account_balance', '#8B5CF6'),
        ('investment', 'Đầu tư', 'trending_up', '#6366F1'),
        ('environment', 'Môi trường', 'eco', '#22C55E'),
        ('safety', 'An toàn', 'security', '#EF4444'),
        ('license', 'Giấy phép', 'badge', '#F59E0B'),
        ('report', 'Báo cáo', 'assessment', '#3B82F6'),
        ('other', 'Khác', 'event', '#64748B')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default categories created');
    }

    // Insert default agencies
    const agencyCount = await client.query("SELECT COUNT(*) FROM agencies");
    if (parseInt(agencyCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO agencies (id, name, short_name) VALUES 
        ('BTC', 'Bộ Tài chính', 'BTC'),
        ('TCT', 'Tổng cục Thuế', 'TCT'),
        ('BHXH', 'Bảo hiểm Xã hội Việt Nam', 'BHXH'),
        ('BLDTBXH', 'Bộ Lao động - Thương binh và Xã hội', 'BLĐTBXH'),
        ('BCA', 'Bộ Công an', 'BCA'),
        ('BTNMT', 'Bộ Tài nguyên và Môi trường', 'BTNMT'),
        ('BCT', 'Bộ Công Thương', 'BCT'),
        ('BKHDT', 'Bộ Kế hoạch và Đầu tư', 'BKHĐT'),
        ('NHNN', 'Ngân hàng Nhà nước', 'NHNN'),
        ('UBCKNN', 'Ủy ban Chứng khoán Nhà nước', 'UBCKNN')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default agencies created');
    }

    // Insert default provinces
    const provCount = await client.query("SELECT COUNT(*) FROM provinces");
    if (parseInt(provCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO provinces (id, name, region) VALUES 
        ('ALL', 'Toàn quốc', 'all'),
        ('HN', 'Hà Nội', 'north'),
        ('HCM', 'TP. Hồ Chí Minh', 'south'),
        ('DN', 'Đà Nẵng', 'central'),
        ('HP', 'Hải Phòng', 'north'),
        ('CT', 'Cần Thơ', 'south'),
        ('BD', 'Bình Dương', 'south'),
        ('DN2', 'Đồng Nai', 'south'),
        ('QN', 'Quảng Ninh', 'north'),
        ('KH', 'Khánh Hòa', 'central')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default provinces created');
    }

    // Insert default settings
    const setCount = await client.query("SELECT COUNT(*) FROM settings");
    if (parseInt(setCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO settings (key, value) VALUES 
        ('app_name', 'HTIC Legal Calendar'),
        ('app_version', '1.0.0'),
        ('company_name', 'HTIC Law Firm'),
        ('contact_email', 'contact@htic.com.vn'),
        ('contact_phone', '0918682879'),
        ('website', 'https://htic.com.vn'),
        ('address', '79/6 Hoàng Văn Thái, P.Tân Mỹ, TP.HCM')
        ON CONFLICT (key) DO NOTHING
      `);
      console.log('✅ Default settings created');
    }

    // Insert sample events
    const evtCount = await client.query("SELECT COUNT(*) FROM events");
    if (parseInt(evtCount.rows[0].count) === 0) {
      const now = new Date();
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const in15days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      await client.query(`
        INSERT INTO events (id, title, description, category, deadline, date, frequency, legal_basis, penalty, agency_id, applies_to, priority) VALUES 
        ('evt_001', 'Nộp tờ khai thuế GTGT tháng 1/2026', 'Doanh nghiệp nộp tờ khai thuế GTGT theo tháng. Hạn nộp chậm nhất ngày 20 tháng sau.', 'tax', '${in7days}', '${in7days}', 'Hàng tháng', 'Thông tư 80/2021/TT-BTC', 'Phạt chậm nộp 0.03%/ngày trên số thuế chậm nộp. Phạt hành chính từ 2-5 triệu đồng.', 'TCT', 'business', 'high'),
        ('evt_002', 'Đóng BHXH, BHYT, BHTN tháng 1/2026', 'Đóng bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp cho người lao động.', 'insurance', '${in15days}', '${in15days}', 'Hàng tháng', 'Luật BHXH 2014, Nghị định 115/2015/NĐ-CP', 'Phạt chậm đóng 0.03%/ngày. Phạt hành chính từ 12-15% số tiền chậm đóng.', 'BHXH', 'business', 'high'),
        ('evt_003', 'Báo cáo tình hình sử dụng lao động', 'Báo cáo định kỳ 6 tháng về tình hình tuyển dụng, sử dụng và quản lý lao động.', 'labor', '${in30days}', '${in30days}', '6 tháng/lần', 'Nghị định 145/2020/NĐ-CP', 'Phạt từ 5-10 triệu đồng đối với doanh nghiệp vi phạm.', 'BLDTBXH', 'business', 'medium')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Sample events created');
    }

    // Insert sample news
    const newsCount = await client.query("SELECT COUNT(*) FROM news");
    if (parseInt(newsCount.rows[0].count) === 0) {
      const today = new Date().toISOString();
      await client.query(`
        INSERT INTO news (id, title, summary, content, category, date, source, is_featured) VALUES 
        ('news_001', 'Cập nhật mức đóng BHXH năm 2026', 'Từ 01/01/2026, mức đóng BHXH có một số điều chỉnh quan trọng mà doanh nghiệp cần lưu ý.', 'Theo quy định mới, mức lương tối thiểu vùng tăng kéo theo mức đóng BHXH tăng tương ứng. Doanh nghiệp cần cập nhật lại bảng lương và mức đóng cho phù hợp.', 'insurance', '${today}', 'Bảo hiểm Xã hội Việt Nam', true),
        ('news_002', 'Hướng dẫn quyết toán thuế TNCN năm 2025', 'Tổng cục Thuế ban hành hướng dẫn chi tiết về quyết toán thuế thu nhập cá nhân năm 2025.', 'Cá nhân có thu nhập từ tiền lương, tiền công phải thực hiện quyết toán thuế TNCN năm 2025 chậm nhất ngày 31/03/2026. Bài viết hướng dẫn chi tiết các bước thực hiện.', 'tax', '${today}', 'Tổng cục Thuế', false)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Sample news created');
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
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  // Try ISO format first
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  // Try dd/mm/yyyy format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API ROUTES (For Flutter App)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'HTIC Legal Calendar API v12.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'PostgreSQL', version: '12.0' });
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get events for app (with joined data)
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        a.name as agency_name,
        a.short_name as agency_short_name,
        p.name as province_name,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      LEFT JOIN categories c ON e.category = c.id
      WHERE e.is_active = true
      ORDER BY e.deadline ASC, e.created_at DESC
    `);
    
    // Transform for Flutter app compatibility
    const events = result.rows.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      categoryName: e.category_name,
      categoryIcon: e.category_icon,
      categoryColor: e.category_color,
      deadline: e.deadline,
      date: e.date || e.deadline,
      frequency: e.frequency,
      legalBasis: e.legal_basis,
      legalReference: e.legal_basis,
      penalty: e.penalty,
      agencyId: e.agency_id,
      agencyName: e.agency_name,
      provinceId: e.province_id,
      provinceName: e.province_name,
      appliesTo: e.applies_to,
      priority: e.priority,
      reminderDays: e.reminder_days
    }));
    
    res.json(events);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get news for app
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM news n
      LEFT JOIN categories c ON n.category = c.id
      WHERE n.is_active = true
      ORDER BY n.date DESC, n.created_at DESC
    `);
    
    const news = result.rows.map(n => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      content: n.content,
      category: n.category,
      categoryName: n.category_name,
      categoryColor: n.category_color,
      date: n.date,
      source: n.source,
      url: n.source_url,
      sourceUrl: n.source_url,
      imageUrl: n.image_url,
      image_url: n.image_url,
      isFeatured: n.is_featured,
      viewCount: n.view_count
    }));
    
    res.json(news);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agencies
app.get('/api/agencies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get provinces
app.get('/api/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });
    }

    res.json({ success: true, message: 'Đăng nhập thành công', user: { username: user.username } });
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

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password = $1 WHERE username = $2', [hashedNew, username]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [events, news, agencies, provinces, categories] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query('SELECT COUNT(*) FROM news'),
      pool.query('SELECT COUNT(*) FROM agencies'),
      pool.query('SELECT COUNT(*) FROM provinces'),
      pool.query('SELECT COUNT(*) FROM categories')
    ]);
    
    res.json({
      events: parseInt(events.rows[0].count),
      news: parseInt(news.rows[0].count),
      agencies: parseInt(agencies.rows[0].count),
      provinces: parseInt(provinces.rows[0].count),
      categories: parseInt(categories.rows[0].count)
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - EVENTS
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, a.name as agency_name, p.name as province_name, c.name as category_name
      FROM events e
      LEFT JOIN agencies a ON e.agency_id = a.id
      LEFT JOIN provinces p ON e.province_id = p.id
      LEFT JOIN categories c ON e.category = c.id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/events', async (req, res) => {
  try {
    const { title, description, category, deadline, date, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, is_active } = req.body;
    const id = generateId('evt');
    
    await pool.query(`
      INSERT INTO events (id, title, description, category, deadline, date, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [id, title, description, category, deadline, date || deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to || 'all', priority || 'medium', reminder_days || 7, is_active !== false]);
    
    res.json({ success: true, message: 'Tạo nghĩa vụ thành công', id });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/admin/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, deadline, date, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, is_active } = req.body;
    
    await pool.query(`
      UPDATE events SET 
        title=$1, description=$2, category=$3, deadline=$4, date=$5, frequency=$6, 
        legal_basis=$7, penalty=$8, agency_id=$9, province_id=$10, applies_to=$11, 
        priority=$12, reminder_days=$13, is_active=$14, updated_at=CURRENT_TIMESTAMP
      WHERE id=$15
    `, [title, description, category, deadline, date, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, is_active, id]);
    
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/admin/events/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - NEWS
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/news', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, c.name as category_name 
      FROM news n 
      LEFT JOIN categories c ON n.category = c.id
      ORDER BY n.date DESC, n.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/news', async (req, res) => {
  try {
    const { title, summary, content, category, date, source, source_url, image_url, is_featured, is_active } = req.body;
    const id = generateId('news');
    
    await pool.query(`
      INSERT INTO news (id, title, summary, content, category, date, source, source_url, image_url, is_featured, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [id, title, summary, content, category, date || new Date().toISOString(), source, source_url, image_url, is_featured || false, is_active !== false]);
    
    res.json({ success: true, message: 'Tạo tin tức thành công', id });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.put('/api/admin/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category, date, source, source_url, image_url, is_featured, is_active } = req.body;
    
    await pool.query(`
      UPDATE news SET title=$1, summary=$2, content=$3, category=$4, date=$5, source=$6, source_url=$7, image_url=$8, is_featured=$9, is_active=$10 WHERE id=$11
    `, [title, summary, content, category, date, source, source_url, image_url, is_featured, is_active, id]);
    
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/admin/news/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { id, name, icon, color } = req.body;
    const catId = id || name.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
    
    await pool.query('INSERT INTO categories (id, name, icon, color) VALUES ($1, $2, $3, $4)', [catId, name, icon, color]);
    res.json({ success: true, message: 'Tạo danh mục thành công', id: catId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server hoặc ID đã tồn tại' });
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    await pool.query('UPDATE categories SET name=$1, icon=$2, color=$3 WHERE id=$4', [name, icon, color, req.params.id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - AGENCIES
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/agencies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/agencies', async (req, res) => {
  try {
    const { id, name, short_name } = req.body;
    const agencyId = id || name.toUpperCase().replace(/\s+/g, '').substring(0, 20);
    
    await pool.query('INSERT INTO agencies (id, name, short_name) VALUES ($1, $2, $3)', [agencyId, name, short_name]);
    res.json({ success: true, message: 'Tạo cơ quan thành công', id: agencyId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server hoặc ID đã tồn tại' });
  }
});

app.put('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { name, short_name } = req.body;
    await pool.query('UPDATE agencies SET name=$1, short_name=$2 WHERE id=$3', [name, short_name, req.params.id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/admin/agencies/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM agencies WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - PROVINCES
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/provinces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provinces ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/provinces', async (req, res) => {
  try {
    const { id, name, region } = req.body;
    const provId = id || name.toUpperCase().replace(/\s+/g, '').substring(0, 20);
    
    await pool.query('INSERT INTO provinces (id, name, region) VALUES ($1, $2, $3)', [provId, name, region]);
    res.json({ success: true, message: 'Tạo tỉnh/TP thành công', id: provId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server hoặc ID đã tồn tại' });
  }
});

app.put('/api/admin/provinces/:id', async (req, res) => {
  try {
    const { name, region } = req.body;
    await pool.query('UPDATE provinces SET name=$1, region=$2 WHERE id=$3', [name, region, req.params.id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/admin/provinces/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM provinces WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRUD - SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
app.put('/api/admin/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await pool.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, value]);
    }
    res.json({ success: true, message: 'Cập nhật cài đặt thành công' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Version: 12.0 (Full Features)`);
  await initializeDatabase();
});

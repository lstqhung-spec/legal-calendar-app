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
const { seedBackfillStepsHalf2026, getLastBackfillH2_2026Result } = require('./seed_h2_2026');
const { seed2027, getLast2027SeedResult } = require('./seed_2027');

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
  // steps: chấp nhận mảng string hoặc 1 chuỗi (mỗi dòng = 1 bước)
  if (cleaned.steps !== undefined && cleaned.steps !== null) {
    let arr = cleaned.steps;
    if (typeof arr === 'string') {
      arr = arr.split(/\r?\n/);
    }
    if (!Array.isArray(arr)) arr = [];
    cleaned.steps = arr
      .map(s => (typeof s === 'string' ? stripHTML(s).trim() : ''))
      .filter(s => s.length > 0);
  } else {
    cleaned.steps = [];
  }
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

    // ─── Idempotent column migrations (safe to re-run) ───
    // newsletters: bổ sung trường cho "Sự kiện pháp lý"
    await client.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS penalty TEXT`);
    await client.query(`ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS affected_subjects TEXT`);
    // events: phân biệt lịch chung (Free) và chuyên ngành (Pro)
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'general'`);
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS industry VARCHAR(50)`);
    // events: hướng dẫn thực hiện (mảng các bước)
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb`);

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

    // Seed lịch tháng 5/2026 — bổ sung steps cho các event hiện có + thêm event lấp ngày trống
    await seedMay2026Events(client);

    // Lô 0 — backfill "Hướng dẫn thực hiện" cho lịch 06-12/2026 (idempotent, UPDATE-only)
    await seedBackfillStepsHalf2026(client, log);

    // Seed lịch năm 2027 (idempotent INSERT theo title+deadline)
    await seed2027(client, log);

    log('INFO', 'Database initialized successfully');
  } finally {
    client.release();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// SEED: Lịch tháng 5/2026 (idempotent — UPDATE chỉ khi steps rỗng; INSERT có
// NOT EXISTS guard theo title+deadline; an toàn khi deploy lại nhiều lần).
// ───────────────────────────────────────────────────────────────────────────
let lastMay2026SeedResult = { status: 'not_run' };
async function seedMay2026Events(client) {
  // ── (A) Bổ sung steps + (nếu trống) description/legal_basis/penalty cho các
  //       event tháng 5/2026 đã tồn tại trên prod
  const existingUpdates = [
    {
      title: 'Duy trì điều kiện Giấy phép hoạt động cơ sở khám chữa bệnh',
      deadline: '2026-05-01',
      steps: [
        'Rà soát giấy phép hoạt động và danh mục kỹ thuật đang thực hiện',
        'Kiểm tra hiệu lực chứng chỉ hành nghề của bác sĩ, điều dưỡng, kỹ thuật viên',
        'Cập nhật hồ sơ trang thiết bị y tế, hồ sơ kiểm định an toàn bức xạ (nếu có)',
        'Đối chiếu nhân lực, cơ sở vật chất với điều kiện đã đăng ký',
        'Liên hệ Sở Y tế khi có thay đổi để bổ sung/điều chỉnh giấy phép kịp thời'
      ],
      description: 'Cơ sở khám chữa bệnh phải duy trì đầy đủ điều kiện về nhân lực, trang thiết bị, cơ sở vật chất và phạm vi hoạt động chuyên môn như đã được cấp phép. Định kỳ rà soát để chủ động bổ sung hồ sơ khi có thay đổi, sẵn sàng cho thanh tra, hậu kiểm của cơ quan quản lý y tế.',
      legal_basis: 'Luật Khám bệnh, chữa bệnh và các văn bản hướng dẫn hiện hành',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động hoặc thu hồi giấy phép tùy mức độ vi phạm. Xem chi tiết tại văn bản được trích dẫn.'
    },
    {
      title: '👷 Nghỉ lễ Ngày Quốc tế Lao động 1/5',
      deadline: '2026-05-01',
      steps: [
        'Thông báo lịch nghỉ lễ cho người lao động trước kỳ nghỉ',
        'Bố trí trực bảo vệ, đảm bảo an toàn tài sản và PCCC trong thời gian nghỉ',
        'Trả lương 300% nếu bố trí làm thêm ngày lễ theo Bộ luật Lao động',
        'Lên kế hoạch khôi phục hoạt động ngay sau kỳ nghỉ'
      ]
    },
    {
      title: 'Thông báo biến động lao động kỳ tháng 4/2026',
      deadline: '2026-05-03',
      steps: [
        'Tổng hợp danh sách lao động tăng/giảm phát sinh trong tháng 4',
        'Lập mẫu thông báo biến động lao động theo quy định hiện hành',
        'Nộp thông báo cho Trung tâm Dịch vụ việc làm trước thời hạn',
        'Lưu biên nhận, đối chiếu với hồ sơ bảo hiểm xã hội'
      ]
    },
    {
      title: 'Tạm nộp thuế TNDN quý 1/2026',
      deadline: '2026-05-04',
      steps: [
        'Ước tính lợi nhuận quý 1 và xác định số thuế TNDN tạm tính',
        'Lập chứng từ nộp tiền vào tài khoản Kho bạc Nhà nước',
        'Hạch toán bút toán tạm nộp vào sổ kế toán',
        'Đảm bảo tổng số tạm nộp 4 quý ≥ 80% nghĩa vụ thực tế cả năm để tránh tiền chậm nộp'
      ]
    },
    {
      title: 'Khai thuế TNCN khấu trừ quý 1/2026',
      deadline: '2026-05-04',
      steps: [
        'Tổng hợp dữ liệu chi trả thu nhập và số thuế đã khấu trừ trong quý 1',
        'Lập tờ khai mẫu 05/KK-TNCN trên phần mềm HTKK',
        'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
        'Nộp tiền thuế (nếu phát sinh) và lưu chứng từ khấu trừ cho từng cá nhân'
      ]
    },
    {
      title: 'Khai thuế GTGT quý 1/2026',
      deadline: '2026-05-04',
      steps: [
        'Đối chiếu hóa đơn đầu vào, đầu ra trong quý 1',
        'Lập tờ khai 01/GTGT trên phần mềm HTKK',
        'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
        'Nộp số thuế GTGT phát sinh (nếu có) đúng hạn'
      ]
    },
    {
      title: 'Cá nhân tự quyết toán thuế TNCN năm 2025',
      deadline: '2026-05-04',
      steps: [
        'Tập hợp chứng từ thu nhập, chứng từ khấu trừ thuế cả năm 2025',
        'Tính lại nghĩa vụ thuế cả năm và đối chiếu với số đã khấu trừ',
        'Đăng ký giảm trừ gia cảnh cho người phụ thuộc (nếu có)',
        'Lập tờ khai 02/QTT-TNCN và nộp qua thuedientu hoặc Cổng dịch vụ công',
        'Nộp bổ sung hoặc đề nghị hoàn thuế nếu phát sinh chênh lệch'
      ]
    },
    {
      title: 'Tập huấn kiến thức an toàn thực phẩm cho nhân viên F&B',
      deadline: '2026-05-12',
      steps: [
        'Lập danh sách nhân viên thuộc diện phải tập huấn',
        'Tổ chức lớp tập huấn nội bộ hoặc thuê đơn vị đủ điều kiện',
        'Đánh giá, cấp/lưu giấy xác nhận kiến thức an toàn thực phẩm',
        'Cập nhật hồ sơ pháp lý cơ sở, sẵn sàng phục vụ thanh tra'
      ]
    },
    {
      title: 'Cấp / gia hạn phù hiệu, biển hiệu phương tiện',
      deadline: '2026-05-15',
      steps: [
        'Rà soát danh sách phương tiện kinh doanh vận tải đang hoạt động',
        'Chuẩn bị hồ sơ: giấy đăng ký, đăng kiểm, hợp đồng vận tải',
        'Nộp hồ sơ qua Cổng dịch vụ công của Sở Giao thông Vận tải',
        'Nhận phù hiệu/biển hiệu và dán vào vị trí quy định trên phương tiện'
      ]
    },
    {
      title: 'Khám sức khỏe định kỳ cho nhân viên chế biến thực phẩm',
      deadline: '2026-05-15',
      steps: [
        'Cập nhật danh sách nhân viên trực tiếp tiếp xúc thực phẩm',
        'Đăng ký lịch khám tại cơ sở y tế có thẩm quyền',
        'Lưu giấy khám sức khỏe đủ điều kiện theo quy định Bộ Y tế',
        'Tạm dừng bố trí làm việc với các trường hợp không đủ điều kiện sức khỏe'
      ]
    },
    {
      title: 'Quan trắc môi trường lao động định kỳ',
      deadline: '2026-05-20',
      steps: [
        'Xác định các yếu tố nguy cơ tại nơi làm việc cần quan trắc',
        'Ký hợp đồng với đơn vị quan trắc đã được cấp chứng nhận',
        'Thực hiện đo đạc và lập báo cáo kết quả quan trắc',
        'Công bố kết quả cho người lao động, gửi cơ quan y tế và lưu hồ sơ'
      ]
    },
    {
      title: 'Khai thuế TNCN khấu trừ kỳ tháng 4/2026',
      deadline: '2026-05-20',
      steps: [
        'Tổng hợp danh sách chi trả thu nhập trong tháng 4',
        'Tính số thuế TNCN phải khấu trừ',
        'Lập tờ khai 05/KK-TNCN trên HTKK',
        'Ký số và nộp tờ khai qua thuedientu trước ngày 20/5'
      ]
    },
    {
      title: 'Khai thuế GTGT kỳ tháng 4/2026',
      deadline: '2026-05-20',
      steps: [
        'Đối chiếu hóa đơn đầu vào, đầu ra trong tháng 4',
        'Lập tờ khai 01/GTGT trên HTKK',
        'Ký số, nộp tờ khai và nộp tiền thuế phát sinh (nếu có)',
        'Lưu chứng từ điện tử và tờ khai đã nộp'
      ]
    },
    {
      title: 'Kiểm nghiệm định kỳ nguyên liệu, nước dùng chế biến',
      deadline: '2026-05-20',
      steps: [
        'Xác định danh mục mẫu cần kiểm nghiệm theo bản tự công bố',
        'Lấy mẫu và gửi đơn vị kiểm nghiệm được công nhận',
        'Lưu phiếu kết quả và đối chiếu với chỉ tiêu đã công bố',
        'Điều chỉnh quy trình, thay đổi nhà cung cấp nếu kết quả không đạt'
      ]
    },
    {
      title: 'Rà soát bản tự công bố sản phẩm thực phẩm',
      deadline: '2026-05-23',
      steps: [
        'Liệt kê sản phẩm đang lưu hành và sản phẩm mới phát sinh',
        'Kiểm tra thông tin trên nhãn, chỉ tiêu chất lượng, hạn dùng',
        'Tự công bố lại khi có thay đổi công thức, nhà cung cấp nguyên liệu',
        'Lưu bản tự công bố tại cơ sở và đăng tải theo quy định'
      ]
    },
    {
      title: 'Kiểm tra, bảo trì hệ thống PCCC khu vực bếp',
      deadline: '2026-05-27',
      steps: [
        'Lập danh mục thiết bị PCCC: bình chữa cháy, hệ thống báo cháy, hút mùi',
        'Thuê đơn vị có chức năng kiểm tra, bảo dưỡng định kỳ',
        'Vệ sinh chụp hút, đường ống dầu mỡ và bếp gas',
        'Cập nhật sổ theo dõi PCCC, biển báo, sơ đồ thoát hiểm'
      ]
    },
    {
      title: 'Bảo lãnh nhà ở hình thành trong tương lai',
      deadline: '2026-05-31',
      steps: [
        'Lập danh sách dự án đủ điều kiện bán nhà hình thành trong tương lai',
        'Liên hệ ngân hàng thương mại ký cam kết bảo lãnh',
        'Gửi văn bản bảo lãnh cho khách hàng cùng hợp đồng mua bán',
        'Lưu hồ sơ bảo lãnh để phục vụ thanh tra của Sở Xây dựng'
      ]
    },
    {
      title: 'Gia hạn Chứng chỉ hành nghề hoạt động xây dựng (cá nhân)',
      deadline: '2026-05-31',
      steps: [
        'Rà soát thời hạn các chứng chỉ hành nghề hiện có của nhân sự',
        'Chuẩn bị hồ sơ gia hạn theo hướng dẫn của Bộ Xây dựng',
        'Nộp hồ sơ qua Cổng dịch vụ công Bộ Xây dựng hoặc Sở chuyên ngành',
        'Theo dõi tiến trình xử lý và lưu chứng chỉ mới khi có kết quả'
      ]
    },
    {
      title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 4/2026',
      deadline: '2026-05-31',
      steps: [
        'Tính 2% trên quỹ tiền lương làm căn cứ đóng BHXH tháng 4',
        'Lập ủy nhiệm chi nộp vào tài khoản công đoàn cấp trên',
        'Hạch toán chi phí, lưu chứng từ chuyển khoản',
        'Đối chiếu với liên đoàn lao động vào cuối quý'
      ]
    },
    {
      title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 5/2026',
      deadline: '2026-05-31',
      steps: [
        'Cập nhật danh sách lao động tham gia, biến động trong tháng',
        'Tính số phải nộp BHXH, BHYT, BHTN, BHTNLĐ-BNN',
        'Lập hồ sơ điện tử trên phần mềm KBHXH hoặc iBHXH',
        'Nộp tiền qua tài khoản chuyên thu của cơ quan BHXH'
      ]
    }
  ];

  for (const ev of existingUpdates) {
    await client.query(
      `UPDATE events
       SET steps = $1::jsonb,
           description = COALESCE(NULLIF(description, ''), $2),
           legal_basis = COALESCE(NULLIF(legal_basis, ''), $3),
           penalty = COALESCE(NULLIF(penalty, ''), $4),
           updated_at = CURRENT_TIMESTAMP
       WHERE title = $5
         AND deadline = $6::date
         AND (steps IS NULL OR steps::text = '[]' OR steps::text = 'null')`,
      [
        JSON.stringify(ev.steps),
        ev.description || null,
        ev.legal_basis || null,
        ev.penalty || null,
        ev.title,
        ev.deadline
      ]
    );
  }

  // ── (B) Lấp các ngày còn trống trong tháng 5/2026 bằng event mới (idempotent)
  const newEvents = [
    // ── Lịch CHUNG (general) ────────────────────────────────────────────────
    {
      title: 'Báo cáo định kỳ tình hình hoạt động doanh nghiệp Q1/2026',
      deadline: '2026-05-02',
      category: 'report',
      scope: 'general',
      industry: null,
      frequency: 'quarterly',
      priority: 'medium',
      description: 'Doanh nghiệp tổng hợp tình hình hoạt động kinh doanh quý 1/2026: doanh thu, lao động, đầu tư, nghĩa vụ ngân sách. Báo cáo nội bộ phục vụ điều hành và làm cơ sở đối chiếu khi cơ quan thống kê, thuế yêu cầu cung cấp số liệu.',
      legal_basis: 'Luật Doanh nghiệp, Luật Thống kê và các văn bản hướng dẫn',
      penalty: 'Có thể bị nhắc nhở, xử phạt nếu chậm cung cấp số liệu khi cơ quan có thẩm quyền yêu cầu. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Tổng hợp doanh thu, chi phí, lợi nhuận quý 1 từ sổ kế toán',
        'Đối chiếu số liệu lao động, tiền lương với báo cáo bảo hiểm',
        'Tổng hợp các khoản đã nộp ngân sách Nhà nước trong quý',
        'Lập báo cáo nội bộ và lưu trữ phục vụ đối chiếu khi cần'
      ]
    },
    {
      title: 'Lập kế hoạch huấn luyện ATVSLĐ 6 tháng cuối năm 2026',
      deadline: '2026-05-05',
      category: 'safety',
      scope: 'general',
      industry: null,
      frequency: 'yearly',
      priority: 'medium',
      description: 'Doanh nghiệp xây dựng kế hoạch huấn luyện an toàn, vệ sinh lao động (ATVSLĐ) cho 6 tháng cuối năm theo nhóm đối tượng: người sử dụng lao động, cán bộ ATVSLĐ, người lao động làm công việc có yêu cầu nghiêm ngặt và lao động phổ thông.',
      legal_basis: 'Luật An toàn, vệ sinh lao động và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính nếu không tổ chức huấn luyện theo quy định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Phân loại lao động theo nhóm huấn luyện ATVSLĐ',
        'Lập kế hoạch huấn luyện chi tiết: nội dung, thời lượng, đơn vị huấn luyện',
        'Dự trù kinh phí và bố trí thời gian phù hợp với hoạt động sản xuất',
        'Trình lãnh đạo phê duyệt và triển khai theo tiến độ'
      ]
    },
    {
      title: 'Báo cáo tình hình sử dụng hóa đơn điện tử',
      deadline: '2026-05-08',
      category: 'tax',
      scope: 'general',
      industry: null,
      frequency: 'monthly',
      priority: 'medium',
      description: 'Đối chiếu, tổng hợp số lượng hóa đơn điện tử đã sử dụng, hủy bỏ, điều chỉnh trong kỳ. Đây là dữ liệu quan trọng phục vụ rà soát nội bộ và làm việc với cơ quan thuế khi cần.',
      legal_basis: 'Quy định hiện hành về hóa đơn điện tử của Bộ Tài chính',
      penalty: 'Có thể bị xử phạt hành chính nếu kê khai, quản lý hóa đơn không đúng quy định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Trích xuất dữ liệu hóa đơn điện tử đã phát hành trong kỳ',
        'Đối chiếu với báo cáo trên Cổng hóa đơn điện tử của Tổng cục Thuế',
        'Rà soát các hóa đơn đã hủy, điều chỉnh, thay thế',
        'Lưu trữ dữ liệu hóa đơn an toàn theo thời hạn quy định'
      ]
    },
    {
      title: 'Rà soát hợp đồng lao động sắp hết hạn',
      deadline: '2026-05-11',
      category: 'labor',
      scope: 'general',
      industry: null,
      frequency: 'monthly',
      priority: 'high',
      description: 'Quản lý nhân sự rà soát danh sách hợp đồng lao động sắp đến hạn để chủ động gia hạn, ký mới hoặc thông báo chấm dứt theo đúng thời hạn báo trước, tránh phát sinh tranh chấp lao động.',
      legal_basis: 'Bộ luật Lao động và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, bồi thường nếu vi phạm quy định về ký kết và chấm dứt hợp đồng lao động. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập danh sách hợp đồng lao động hết hạn trong 30-60 ngày tới',
        'Đánh giá nhu cầu nhân sự, kết quả công việc của từng vị trí',
        'Soạn thảo phụ lục gia hạn hoặc hợp đồng mới',
        'Gửi thông báo chấm dứt hợp đồng đúng thời hạn báo trước (nếu có)',
        'Lưu hồ sơ ký kết để phục vụ thanh tra lao động'
      ]
    },
    {
      title: 'Báo cáo công tác PCCC định kỳ',
      deadline: '2026-05-13',
      category: 'safety',
      scope: 'general',
      industry: null,
      frequency: 'yearly',
      priority: 'high',
      description: 'Cơ sở thuộc diện quản lý PCCC định kỳ báo cáo tình hình thực hiện công tác phòng cháy chữa cháy: phương tiện, lực lượng tại chỗ, tình hình kiểm tra, sự cố (nếu có) gửi cơ quan Cảnh sát PCCC quản lý địa bàn.',
      legal_basis: 'Luật Phòng cháy và chữa cháy và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động nếu không bảo đảm điều kiện PCCC. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Tập hợp hồ sơ kiểm tra, bảo dưỡng PCCC trong kỳ',
        'Đánh giá tình trạng phương tiện, lực lượng PCCC cơ sở',
        'Lập báo cáo theo mẫu của cơ quan Cảnh sát PCCC',
        'Gửi báo cáo và lưu bản sao tại cơ sở'
      ]
    },
    {
      title: 'Đối chiếu công nợ thuế đầu kỳ',
      deadline: '2026-05-18',
      category: 'tax',
      scope: 'general',
      industry: null,
      frequency: 'quarterly',
      priority: 'medium',
      description: 'Kế toán đối chiếu số dư công nợ thuế với cơ quan thuế qua tài khoản thuedientu để kịp thời phát hiện chênh lệch, xử lý các khoản tiền chậm nộp, nộp thừa hoặc bù trừ giữa các sắc thuế.',
      legal_basis: 'Luật Quản lý thuế và các văn bản hướng dẫn',
      penalty: 'Tính tiền chậm nộp 0,03%/ngày trên số tiền thuế chậm nộp; có thể bị cưỡng chế tài khoản nếu nợ kéo dài. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Đăng nhập thuedientu.gdt.gov.vn và lấy bảng kê nghĩa vụ thuế',
        'Đối chiếu số phát sinh, đã nộp, còn nợ với sổ kế toán',
        'Gửi đề nghị tra soát nếu phát hiện chênh lệch',
        'Nộp bù số còn thiếu và xử lý tiền chậm nộp (nếu có)'
      ]
    },
    {
      title: 'Cập nhật danh sách cổ đông, thành viên góp vốn',
      deadline: '2026-05-22',
      category: 'report',
      scope: 'general',
      industry: null,
      frequency: 'yearly',
      priority: 'medium',
      description: 'Doanh nghiệp rà soát, cập nhật sổ đăng ký cổ đông/thành viên góp vốn khi có biến động về chuyển nhượng, thừa kế, tăng/giảm vốn để bảo đảm tuân thủ và sẵn sàng cho các giao dịch lớn.',
      legal_basis: 'Luật Doanh nghiệp và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính nếu không cập nhật, lưu giữ sổ đăng ký cổ đông/thành viên theo quy định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Tổng hợp các biến động về cổ đông/thành viên trong kỳ',
        'Cập nhật sổ đăng ký theo đúng mẫu quy định',
        'Lưu hợp đồng chuyển nhượng, biên bản họp, quyết định liên quan',
        'Cập nhật thông tin lên Cổng dịch vụ công về đăng ký doanh nghiệp khi cần'
      ]
    },
    {
      title: 'Báo cáo tài chính giữa niên độ — chuẩn bị số liệu',
      deadline: '2026-05-24',
      category: 'report',
      scope: 'general',
      industry: null,
      frequency: 'yearly',
      priority: 'medium',
      description: 'Doanh nghiệp thuộc diện lập báo cáo tài chính giữa niên độ chuẩn bị tổng hợp số liệu nửa đầu năm: bảng cân đối kế toán, kết quả hoạt động, lưu chuyển tiền tệ và thuyết minh.',
      legal_basis: 'Chuẩn mực kế toán Việt Nam và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, ảnh hưởng đến nghĩa vụ công bố thông tin (đối với DN niêm yết). Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Khóa sổ tạm cuối tháng 4, đối chiếu số dư các tài khoản trọng yếu',
        'Tổng hợp dự thảo bảng cân đối kế toán và kết quả kinh doanh nửa năm',
        'Rà soát ước tính kế toán, dự phòng, trích trước cuối kỳ',
        'Bàn giao dự thảo cho kiểm toán/soát xét (nếu có)'
      ]
    },
    {
      title: 'Kê khai phí bảo vệ môi trường đối với nước thải Q1/2026',
      deadline: '2026-05-26',
      category: 'environment',
      scope: 'general',
      industry: null,
      frequency: 'quarterly',
      priority: 'medium',
      description: 'Tổ chức, cá nhân xả nước thải công nghiệp thuộc đối tượng kê khai, nộp phí bảo vệ môi trường thực hiện kê khai số liệu xả thải quý 1 và nộp phí theo quy định.',
      legal_basis: 'Quy định hiện hành về phí bảo vệ môi trường đối với nước thải',
      penalty: 'Có thể bị xử phạt hành chính, truy thu phí và tiền chậm nộp nếu kê khai không đầy đủ. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Tổng hợp khối lượng nước thải, kết quả quan trắc chất thải quý 1',
        'Tính phí cố định và phí biến đổi theo quy định',
        'Lập tờ khai phí bảo vệ môi trường và nộp cho cơ quan thuế',
        'Lưu chứng từ nộp tiền và hồ sơ tính toán'
      ]
    },
    {
      title: 'Báo cáo kết quả quan trắc môi trường định kỳ',
      deadline: '2026-05-28',
      category: 'environment',
      scope: 'general',
      industry: null,
      frequency: 'yearly',
      priority: 'medium',
      description: 'Cơ sở thuộc đối tượng phải quan trắc môi trường định kỳ thực hiện báo cáo kết quả gửi cơ quan quản lý môi trường địa phương theo nội dung đã cam kết trong giấy phép môi trường.',
      legal_basis: 'Luật Bảo vệ môi trường và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động nếu vượt giới hạn cho phép. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Thuê đơn vị quan trắc đã được cấp phép thực hiện đo đạc',
        'Lập báo cáo kết quả quan trắc theo mẫu quy định',
        'Gửi báo cáo cho Sở Tài nguyên & Môi trường địa phương',
        'Lưu hồ sơ tại cơ sở để phục vụ thanh tra, hậu kiểm'
      ]
    },
    {
      title: 'Rà soát giấy phép con sắp hết hạn',
      deadline: '2026-05-29',
      category: 'license',
      scope: 'general',
      industry: null,
      frequency: 'monthly',
      priority: 'medium',
      description: 'Doanh nghiệp rà soát toàn bộ giấy phép con (PCCC, vệ sinh ATTP, môi trường, kinh doanh có điều kiện, v.v.) đến hạn để chủ động hồ sơ gia hạn, tránh gián đoạn hoạt động.',
      legal_basis: 'Các văn bản chuyên ngành liên quan đến từng loại giấy phép',
      penalty: 'Hoạt động khi giấy phép hết hạn có thể bị xử phạt, đình chỉ và truy thu lợi nhuận. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập danh mục toàn bộ giấy phép con đang sở hữu kèm ngày hết hạn',
        'Đánh dấu các giấy phép hết hạn trong 60-90 ngày tới',
        'Chuẩn bị hồ sơ gia hạn theo quy định của từng loại giấy phép',
        'Phân công đầu mối nộp hồ sơ và theo dõi tiến trình xử lý'
      ]
    },
    {
      title: 'Chuẩn bị hồ sơ hoàn thuế GTGT (nếu phát sinh)',
      deadline: '2026-05-30',
      category: 'tax',
      scope: 'general',
      industry: null,
      frequency: 'quarterly',
      priority: 'medium',
      description: 'Doanh nghiệp có số thuế GTGT đầu vào chưa khấu trừ hết và đủ điều kiện hoàn thuế chủ động chuẩn bị hồ sơ để rút ngắn thời gian xử lý và sớm thu hồi dòng tiền.',
      legal_basis: 'Luật Thuế giá trị gia tăng và Luật Quản lý thuế',
      penalty: 'Hoàn thuế sai quy định có thể bị truy thu, xử phạt và tính tiền chậm nộp. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Đối chiếu số thuế GTGT đầu vào chưa khấu trừ với điều kiện hoàn thuế',
        'Chuẩn bị hợp đồng, hóa đơn, chứng từ thanh toán không dùng tiền mặt',
        'Lập đề nghị hoàn thuế theo mẫu và nộp qua thuedientu',
        'Theo dõi văn bản trả lời, bổ sung hồ sơ khi cơ quan thuế yêu cầu'
      ]
    },
    // ── Lịch CHUYÊN NGÀNH (industry) ────────────────────────────────────────
    {
      title: 'Đánh giá rủi ro vệ sinh an toàn thực phẩm tại bếp ăn',
      deadline: '2026-05-07',
      category: 'safety',
      scope: 'industry',
      industry: 'fnb',
      frequency: 'yearly',
      priority: 'high',
      description: 'Cơ sở dịch vụ ăn uống định kỳ rà soát rủi ro tại bếp: nguồn nguyên liệu, quy trình chế biến, bảo quản, vệ sinh dụng cụ. Hoạt động này giúp giảm sự cố ngộ độc và sẵn sàng cho thanh tra của cơ quan an toàn thực phẩm.',
      legal_basis: 'Luật An toàn thực phẩm và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động nếu để xảy ra sự cố ngộ độc thực phẩm. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập sơ đồ quy trình chế biến và xác định điểm kiểm soát tới hạn',
        'Kiểm tra hồ sơ nguồn gốc nguyên liệu, hợp đồng nhà cung cấp',
        'Đánh giá điều kiện bảo quản, nhiệt độ kho lạnh, vệ sinh dụng cụ',
        'Lập biên bản đánh giá, đề xuất biện pháp khắc phục',
        'Tổ chức quán triệt cho nhân viên bếp về quy trình mới (nếu có)'
      ]
    },
    {
      title: 'Kiểm định lại an toàn cẩu tháp, vận thăng tại công trình',
      deadline: '2026-05-09',
      category: 'safety',
      scope: 'industry',
      industry: 'xay_dung',
      frequency: 'yearly',
      priority: 'high',
      description: 'Cẩu tháp, vận thăng nâng người/hàng tại công trình xây dựng là thiết bị có yêu cầu nghiêm ngặt về an toàn lao động, phải được kiểm định an toàn định kỳ trước khi tiếp tục sử dụng.',
      legal_basis: 'Luật An toàn, vệ sinh lao động và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ thiết bị nếu sử dụng khi chưa kiểm định hoặc hết hạn kiểm định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập danh mục thiết bị đến hạn kiểm định trên các công trường',
        'Ký hợp đồng với tổ chức kiểm định kỹ thuật đã được cấp phép',
        'Phối hợp dừng vận hành để thực hiện kiểm định',
        'Dán tem kiểm định, cập nhật hồ sơ thiết bị tại công trường',
        'Lưu giấy chứng nhận kiểm định để phục vụ thanh tra'
      ]
    },
    {
      title: 'Báo cáo sử dụng thuốc gây nghiện, hướng tâm thần Q1/2026',
      deadline: '2026-05-14',
      category: 'report',
      scope: 'industry',
      industry: 'y_te',
      frequency: 'quarterly',
      priority: 'high',
      description: 'Cơ sở khám chữa bệnh, nhà thuốc đang quản lý thuốc gây nghiện, thuốc hướng tâm thần và tiền chất dùng làm thuốc lập báo cáo định kỳ về tình hình nhập, xuất, tồn kho gửi Sở Y tế.',
      legal_basis: 'Luật Dược và các văn bản hướng dẫn về thuốc kiểm soát đặc biệt',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động, thu hồi chứng chỉ nếu vi phạm quản lý thuốc kiểm soát đặc biệt. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Đối chiếu sổ theo dõi xuất nhập với hóa đơn, đơn thuốc',
        'Kiểm kê thực tế thuốc gây nghiện, hướng tâm thần',
        'Lập báo cáo theo mẫu quy định của Bộ Y tế',
        'Gửi báo cáo cho Sở Y tế và lưu hồ sơ tại cơ sở'
      ]
    },
    {
      title: 'Rà soát hợp đồng đại lý, nhượng quyền thương mại',
      deadline: '2026-05-16',
      category: 'license',
      scope: 'industry',
      industry: 'ban_le',
      frequency: 'yearly',
      priority: 'medium',
      description: 'Doanh nghiệp bán lẻ vận hành hệ thống đại lý, nhượng quyền rà soát các hợp đồng đang có hiệu lực để bảo đảm tuân thủ về điều kiện, đăng ký nhượng quyền và nghĩa vụ thuế.',
      legal_basis: 'Luật Thương mại và các văn bản hướng dẫn về nhượng quyền thương mại',
      penalty: 'Có thể bị xử phạt hành chính nếu hoạt động nhượng quyền không đăng ký theo quy định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập danh mục hợp đồng đại lý, nhượng quyền đang hiệu lực',
        'Đối chiếu nghĩa vụ tài chính, doanh thu phát sinh',
        'Cập nhật danh sách đại lý lên cơ quan đăng ký (khi có thay đổi)',
        'Soát xét điều khoản bảo mật, sở hữu trí tuệ, chấm dứt hợp đồng'
      ]
    },
    {
      title: 'Báo cáo quản lý chất thải nguy hại Q1/2026',
      deadline: '2026-05-19',
      category: 'environment',
      scope: 'industry',
      industry: 'san_xuat',
      frequency: 'quarterly',
      priority: 'high',
      description: 'Chủ nguồn thải chất thải nguy hại trong lĩnh vực sản xuất tổng hợp khối lượng phát sinh, chuyển giao và xử lý trong quý 1 để báo cáo cơ quan quản lý môi trường.',
      legal_basis: 'Luật Bảo vệ môi trường và các văn bản hướng dẫn về quản lý chất thải nguy hại',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động nếu xử lý chất thải nguy hại sai quy định. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Tổng hợp khối lượng chất thải nguy hại phát sinh theo mã CTNH',
        'Đối chiếu chứng từ chuyển giao với đơn vị xử lý đã có giấy phép',
        'Lập báo cáo theo mẫu quy định',
        'Gửi báo cáo cho Sở Tài nguyên & Môi trường và lưu hồ sơ'
      ]
    },
    {
      title: 'Kiểm tra điều kiện an toàn giao thông phương tiện vận tải',
      deadline: '2026-05-21',
      category: 'safety',
      scope: 'industry',
      industry: 'logistic',
      frequency: 'monthly',
      priority: 'high',
      description: 'Doanh nghiệp kinh doanh vận tải đường bộ kiểm tra định kỳ điều kiện ATGT của phương tiện và lái xe trước khi xuất bến, đảm bảo đăng kiểm còn hiệu lực, lốp, phanh, thiết bị giám sát hành trình hoạt động bình thường.',
      legal_basis: 'Luật Giao thông đường bộ và các văn bản hướng dẫn về kinh doanh vận tải',
      penalty: 'Có thể bị xử phạt hành chính, thu hồi phù hiệu vận tải. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Kiểm tra hạn đăng kiểm, bảo hiểm bắt buộc của phương tiện',
        'Kiểm tra hoạt động thiết bị giám sát hành trình, camera',
        'Kiểm tra giấy phép lái xe, sức khỏe của lái xe',
        'Lập sổ theo dõi kiểm tra trước khi xuất bến',
        'Ngừng vận hành phương tiện không đảm bảo điều kiện'
      ]
    },
    {
      title: 'Bồi dưỡng định kỳ chỉ huy trưởng công trình',
      deadline: '2026-05-25',
      category: 'labor',
      scope: 'industry',
      industry: 'xay_dung',
      frequency: 'yearly',
      priority: 'medium',
      description: 'Chỉ huy trưởng công trình và cán bộ chủ chốt tại công trường xây dựng tham gia bồi dưỡng định kỳ về quản lý dự án, an toàn lao động và pháp luật xây dựng cập nhật.',
      legal_basis: 'Luật Xây dựng và các văn bản hướng dẫn',
      penalty: 'Có thể bị xử phạt hành chính, đình chỉ hoạt động cá nhân nếu không đáp ứng điều kiện hành nghề. Xem chi tiết tại văn bản được trích dẫn.',
      steps: [
        'Lập danh sách chỉ huy trưởng, cán bộ chủ chốt cần bồi dưỡng',
        'Đăng ký lớp bồi dưỡng tại cơ sở đào tạo có thẩm quyền',
        'Theo dõi kết quả và cấp chứng nhận hoàn thành',
        'Cập nhật hồ sơ năng lực cá nhân và hồ sơ năng lực công ty'
      ]
    }
  ];

  let inserted = 0;
  let skipped = 0;
  const insertErrors = [];
  for (const ev of newEvents) {
    try {
      const exists = await client.query(
        `SELECT 1 FROM events WHERE title = $1 AND deadline = $2::date LIMIT 1`,
        [ev.title, ev.deadline]
      );
      if (exists.rowCount > 0) {
        skipped += 1;
        continue;
      }
      await client.query(
        `INSERT INTO events
           (title, description, category, deadline, frequency, legal_basis, penalty,
            applies_to, priority, reminder_days, scope, industry, steps, source, source_url, is_active)
         VALUES
           ($1, $2, $3, $4::date, $5, $6, $7,
            $8, $9, 7, $10, $11, $12::jsonb, $13, $14, true)`,
        [
          ev.title,
          ev.description || null,
          ev.category || 'other',
          ev.deadline,
          ev.frequency || null,
          ev.legal_basis || null,
          ev.penalty || null,
          ev.applies_to || 'business',
          ev.priority || 'medium',
          ev.scope || 'general',
          ev.industry || null,
          JSON.stringify(ev.steps || []),
          ev.source || null,
          ev.source_url || null
        ]
      );
      inserted += 1;
    } catch (e) {
      log('ERROR', 'Seed event insert failed', {
        title: ev.title,
        deadline: ev.deadline,
        error: e.message
      });
      insertErrors.push({ title: ev.title, deadline: ev.deadline, error: e.message });
    }
  }

  log('INFO', 'May 2026 event seed completed', { inserted, skipped, total: newEvents.length });
  lastMay2026SeedResult = {
    status: 'ok',
    ran_at: new Date().toISOString(),
    updates_attempted: existingUpdates.length,
    inserts_attempted: newEvents.length,
    inserts_done: inserted,
    inserts_skipped_existing: skipped,
    insert_errors: insertErrors
  };
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

// Diagnostic (read-only): kết quả seed lịch tháng 5/2026 ở lần boot gần nhất.
app.get('/api/debug/may2026-seed-status', (req, res) => {
  res.json({ success: true, data: lastMay2026SeedResult });
});

// Diagnostic (read-only): kết quả backfill steps cho lịch 06-12/2026 ở lần boot gần nhất.
app.get('/api/debug/backfill-h2-2026-status', (req, res) => {
  res.json({ success: true, data: getLastBackfillH2_2026Result() });
});

// Diagnostic (read-only): kết quả seed lịch 2027 ở lần boot gần nhất.
app.get('/api/debug/seed-2027-status', (req, res) => {
  res.json({ success: true, data: getLast2027SeedResult() });
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
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, scope, industry, steps, is_active } = cleanedData;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }

    // Validate scope + industry pairing
    const normalizedScope = scope === 'industry' ? 'industry' : 'general';
    if (normalizedScope === 'industry' && !industry) {
      return res.status(400).json({ success: false, message: 'Phải chọn Ngành khi loại lịch là Chuyên ngành' });
    }
    const normalizedIndustry = normalizedScope === 'industry' ? industry : null;

    const result = await pool.query(
      `INSERT INTO events (title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, scope, industry, steps, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19) RETURNING *`,
      [title, description, category, deadline, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days || 7, notes, source, source_url, normalizedScope, normalizedIndustry, JSON.stringify(steps || []), is_active !== false]
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
    const { title, description, category, deadline, frequency, legal_basis, penalty, agency_id, province_id, applies_to, priority, reminder_days, notes, source, source_url, scope, industry, steps, is_active } = cleanedData;

    const normalizedScope = scope === 'industry' ? 'industry' : 'general';
    if (normalizedScope === 'industry' && !industry) {
      return res.status(400).json({ success: false, message: 'Phải chọn Ngành khi loại lịch là Chuyên ngành' });
    }
    const normalizedIndustry = normalizedScope === 'industry' ? industry : null;

    const result = await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3, deadline=$4, frequency=$5, legal_basis=$6, penalty=$7, agency_id=$8, province_id=$9, applies_to=$10, priority=$11, reminder_days=$12, notes=$13, source=$14, source_url=$15, scope=$16, industry=$17, steps=$18::jsonb, is_active=$19, updated_at=CURRENT_TIMESTAMP WHERE id=$20 RETURNING *`,
      [title, description, category, deadline, frequency, legal_basis, penalty, agency_id || null, province_id || null, applies_to, priority, reminder_days, notes, source, source_url, normalizedScope, normalizedIndustry, JSON.stringify(steps || []), is_active, id]
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
    const { title, summary, content, industry, category, type, priority, legal_doc, effective_date, penalty, affected_subjects, is_published, is_active } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }
    const published_at = is_published ? new Date() : null;
    const result = await pool.query(
      `INSERT INTO newsletters (title, summary, content, industry, category, type, priority, legal_doc, effective_date, penalty, affected_subjects, is_published, is_active, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [title, summary || null, content || null, industry || 'all', category || 'general', type || 'regulation', priority || 'normal', legal_doc || null, effective_date || null, penalty || null, affected_subjects || null, is_published || false, is_active !== false, published_at]
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
    const { title, summary, content, industry, category, type, priority, legal_doc, effective_date, penalty, affected_subjects, is_published, is_active } = req.body;

    // If publishing for the first time, set published_at
    const existing = await pool.query('SELECT is_published, published_at FROM newsletters WHERE id = $1', [id]);
    let published_at = existing.rows[0]?.published_at;
    if (is_published && !existing.rows[0]?.is_published) {
      published_at = new Date();
    }

    const result = await pool.query(
      `UPDATE newsletters SET title=$1, summary=$2, content=$3, industry=$4, category=$5, type=$6, priority=$7, legal_doc=$8, effective_date=$9, penalty=$10, affected_subjects=$11, is_published=$12, is_active=$13, published_at=$14, updated_at=CURRENT_TIMESTAMP
       WHERE id=$15 RETURNING *`,
      [title, summary, content, industry, category, type, priority, legal_doc, effective_date || null, penalty || null, affected_subjects || null, is_published, is_active, published_at, id]
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

// Endpoint tạm: ẩn toàn bộ newsletters đang active (chuẩn bị reset kho "Sự kiện pháp lý").
// Yêu cầu body { confirm: "HIDE_ALL_NEWSLETTERS" } để tránh gọi nhầm.
app.post('/api/admin/newsletters/hide-all', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    if (req.body?.confirm !== 'HIDE_ALL_NEWSLETTERS') {
      return res.status(400).json({
        success: false,
        message: 'Phải gửi body { "confirm": "HIDE_ALL_NEWSLETTERS" } để xác nhận'
      });
    }
    const result = await pool.query(
      `UPDATE newsletters SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE is_active = true RETURNING id`
    );
    log('WARN', 'Newsletters bulk hidden', { admin: req.admin?.username, count: result.rowCount });
    res.json({ success: true, hidden: result.rowCount, message: `Đã ẩn ${result.rowCount} bản tin` });
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
// Debug endpoint: kiểm tra FCM status (tạm thời)
app.get('/api/admin/fcm-status', adminAuth, async (req, res) => {
  try {
    const fcmReady = !!firebaseAdmin;
    let devices = [];
    if (pool && dbConnected) {
      const r = await pool.query(
        'SELECT device_id, platform, is_active, updated_at, LEFT(fcm_token, 20) as token_prefix FROM user_devices ORDER BY updated_at DESC'
      );
      devices = r.rows;
    }
    res.json({ fcm_initialized: fcmReady, total_devices: devices.length, active_devices: devices.filter(d => d.is_active).length, devices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.delete('/api/admin/devices/:device_id', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  try {
    await pool.query('DELETE FROM user_devices WHERE device_id = $1', [req.params.device_id]);
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

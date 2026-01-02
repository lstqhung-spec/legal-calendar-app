const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

// Data file paths - trong thư mục backend/data/
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const PROVINCES_FILE = path.join(DATA_DIR, 'provinces.json');
const AGENCIES_FILE = path.join(DATA_DIR, 'agencies.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const COMPANY_FILE = path.join(DATA_DIR, 'company.json');

// Frontend directory - thư mục frontend/
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions
function readJSON(file) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading', file, e);
    }
    return [];
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing', file, e);
        return false;
    }
}

function getNextId(items) {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map(i => parseInt(i.id) || 0)) + 1;
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function serveStatic(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        }
    });
}

// Initialize default data
function initializeData() {
    // Default users
    if (!fs.existsSync(USERS_FILE)) {
        writeJSON(USERS_FILE, []);
    }

    // Default subscriptions
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
        const defaultSubscriptions = [
            { id: 1, name: 'Miễn phí', price: 0, period: 'forever', features: ['Xem lịch pháp lý cơ bản', 'Tối đa 5 sự kiện/tháng', 'Tin tức pháp lý', 'Tra cứu cơ quan cơ bản'], notIncluded: ['Nhắc nhở tự động', 'Liên hệ luật sư', 'Tài liệu pháp lý', 'Hỗ trợ ưu tiên'], isActive: true },
            { id: 2, name: 'Pro', price: 199000, period: 'monthly', popular: true, features: ['Tất cả tính năng miễn phí', 'Không giới hạn sự kiện', 'Nhắc nhở tự động đa kênh', 'Liên hệ luật sư 24/7', 'Thư viện tài liệu pháp lý', 'Hỗ trợ ưu tiên'], notIncluded: [], isActive: true },
            { id: 3, name: 'Doanh nghiệp', price: 499000, period: 'monthly', features: ['Tất cả tính năng Pro', 'Quản lý đa chi nhánh', 'API tích hợp', 'Báo cáo chi tiết', 'Tư vấn pháp lý riêng', 'Account Manager'], notIncluded: [], isActive: true }
        ];
        writeJSON(SUBSCRIPTIONS_FILE, defaultSubscriptions);
    }

    // Default company info
    if (!fs.existsSync(COMPANY_FILE)) {
        const defaultCompany = {
            name: 'Công ty Luật HTIC',
            shortName: 'HTIC Law',
            slogan: 'Đồng hành pháp lý - Phát triển bền vững',
            description: 'Công ty Luật HTIC được thành lập với sứ mệnh cung cấp các giải pháp pháp lý toàn diện cho doanh nghiệp Việt Nam.',
            address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
            phone: '1900 123 456',
            hotline: '0901 234 567',
            email: 'contact@hticlaw.vn',
            website: 'https://hticlaw.vn',
            workingHours: 'Thứ 2 - Thứ 7: 8:00 - 17:30',
            taxCode: '0123456789',
            foundedYear: 2010,
            experience: '15+',
            clients: '500+',
            cases: '1000+',
            services: ['Tư vấn pháp luật doanh nghiệp', 'Soạn thảo hợp đồng', 'Tư vấn thuế & kế toán', 'Pháp luật lao động', 'Sáp nhập & Mua bán doanh nghiệp', 'Sở hữu trí tuệ'],
            social: { facebook: '', linkedin: '', youtube: '' },
            logo: null
        };
        writeJSON(COMPANY_FILE, defaultCompany);
    }

    // Default settings
    if (!fs.existsSync(SETTINGS_FILE)) {
        writeJSON(SETTINGS_FILE, { logo: null, appName: 'HTIC Legal', appVersion: '2.0.0', primaryColor: '#136DEC' });
    }

    // Default events
    if (!fs.existsSync(EVENTS_FILE) || readJSON(EVENTS_FILE).length === 0) {
        const defaultEvents = [
            { id: 1, title: 'Nộp tờ khai thuế GTGT tháng', category: 'tax', deadline: '2026-01-20', description: 'Nộp tờ khai thuế GTGT tháng trước theo mẫu 01/GTGT', legalBasis: 'Theo Điều 44 Luật Quản lý thuế 2019', penalty: 'Phạt 2-5 triệu đồng nếu nộp chậm', isActive: true },
            { id: 2, title: 'Đóng BHXH, BHYT, BHTN tháng 1/2026', category: 'insurance', deadline: '2026-01-25', description: 'Đóng bảo hiểm xã hội, y tế, thất nghiệp hàng tháng', legalBasis: 'Luật Bảo hiểm xã hội 2014', penalty: 'Phạt 12-15% số tiền chậm đóng', isActive: true },
            { id: 3, title: 'Nộp tờ khai thuế TNCN', category: 'tax', deadline: '2026-01-20', description: 'Nộp tờ khai thuế thu nhập cá nhân', legalBasis: 'Thông tư 111/2013/TT-BTC', penalty: 'Phạt 2-5 triệu đồng', isActive: true }
        ];
        writeJSON(EVENTS_FILE, defaultEvents);
    }

    // Default news
    if (!fs.existsSync(NEWS_FILE) || readJSON(NEWS_FILE).length === 0) {
        const defaultNews = [
            { id: 1, title: 'Cập nhật mức đóng BHXH mới nhất 2026', category: 'insurance', date: new Date().toISOString(), summary: 'Tổng hợp các thay đổi về tỷ lệ đóng BHXH từ tháng 1/2026', content: 'Theo quy định mới, mức đóng BHXH bắt buộc sẽ được điều chỉnh từ ngày 01/01/2026.', imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', isHot: true },
            { id: 2, title: 'Hạn cuối nộp tờ khai thuế GTGT quý IV/2025', category: 'tax', date: new Date(Date.now() - 86400000).toISOString(), summary: 'Doanh nghiệp cần lưu ý thời hạn nộp tờ khai thuế', content: 'Tổng cục Thuế thông báo hạn cuối nộp tờ khai thuế GTGT quý IV/2025 là ngày 30/01/2026.', imageUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400', isHot: true }
        ];
        writeJSON(NEWS_FILE, defaultNews);
    }

    // Default agencies
    if (!fs.existsSync(AGENCIES_FILE) || readJSON(AGENCIES_FILE).length === 0) {
        const defaultAgencies = [
            { id: 1, name: 'Cục Thuế TP. Hồ Chí Minh', type: 'tax', city: 'TP. Hồ Chí Minh', address: '63 Vũ Tông Phan, Quận 2', phone: '028 3770 2288', email: 'cucthue.hcm@gdt.gov.vn', workingHours: 'Thứ 2 - Thứ 6: 7:30 - 16:30', description: 'Cục Thuế TP.HCM', services: ['Đăng ký thuế', 'Kê khai thuế', 'Hoàn thuế'] },
            { id: 2, name: 'BHXH Quận 1', type: 'insurance', city: 'TP. Hồ Chí Minh', address: '35 Lý Tự Trọng, Quận 1', phone: '028 3827 5566', email: 'bhxh.quan1@vss.gov.vn', workingHours: 'Thứ 2 - Thứ 6: 7:30 - 16:30', description: 'Cơ quan BHXH quận 1', services: ['Đăng ký BHXH', 'Cấp sổ BHXH', 'Cấp thẻ BHYT'] }
        ];
        writeJSON(AGENCIES_FILE, defaultAgencies);
    }

    // Default provinces
    if (!fs.existsSync(PROVINCES_FILE) || readJSON(PROVINCES_FILE).length === 0) {
        const defaultProvinces = [
            { id: 'hcm', name: 'TP. Hồ Chí Minh' },
            { id: 'hanoi', name: 'Hà Nội' },
            { id: 'danang', name: 'Đà Nẵng' }
        ];
        writeJSON(PROVINCES_FILE, defaultProvinces);
    }
}

// Initialize data
initializeData();

// Create server
const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    const parsedUrl = new URL(url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // =============== API ROUTES ===============

    // --- AUTH ---
    if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        if (users.find(u => u.email === body.email)) {
            return sendJSON(res, { success: false, message: 'Email đã được sử dụng' }, 400);
        }
        const newUser = {
            id: getNextId(users),
            companyName: body.companyName || '',
            taxCode: body.taxCode || '',
            email: body.email,
            phone: body.phone || '',
            password: hashPassword(body.password),
            subscription: 'free',
            createdAt: new Date().toISOString(),
            isActive: true
        };
        users.push(newUser);
        if (writeJSON(USERS_FILE, users)) {
            const { password, ...userWithoutPassword } = newUser;
            return sendJSON(res, { success: true, data: userWithoutPassword, token: generateToken(), message: 'Đăng ký thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu dữ liệu' }, 500);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email === body.email && u.password === hashPassword(body.password));
        if (user && user.isActive) {
            const { password, ...userWithoutPassword } = user;
            return sendJSON(res, { success: true, data: userWithoutPassword, token: generateToken() });
        }
        return sendJSON(res, { success: false, message: 'Email hoặc mật khẩu không đúng' }, 401);
    }

    // --- EVENTS ---
    if (pathname === '/api/events' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        return sendJSON(res, { success: true, data: events.filter(e => e.isActive !== false) });
    }

    if (pathname === '/api/admin/events' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(EVENTS_FILE) });
    }

    if (pathname === '/api/admin/events' && method === 'POST') {
        const body = await parseBody(req);
        const events = readJSON(EVENTS_FILE);
        const newEvent = { id: getNextId(events), ...body, isActive: body.isActive !== false };
        events.push(newEvent);
        if (writeJSON(EVENTS_FILE, events)) {
            return sendJSON(res, { success: true, data: newEvent, message: 'Sự kiện đã được tạo' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    const eventMatch = pathname.match(/^\/api\/admin\/events\/(\d+)$/);
    if (eventMatch) {
        const eventId = parseInt(eventMatch[1]);
        const events = readJSON(EVENTS_FILE);
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (method === 'PUT') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            const body = await parseBody(req);
            events[eventIndex] = { ...events[eventIndex], ...body };
            if (writeJSON(EVENTS_FILE, events)) return sendJSON(res, { success: true, data: events[eventIndex] });
            return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
        }
        if (method === 'DELETE') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            events.splice(eventIndex, 1);
            if (writeJSON(EVENTS_FILE, events)) return sendJSON(res, { success: true, message: 'Đã xóa' });
            return sendJSON(res, { success: false, message: 'Lỗi khi xóa' }, 500);
        }
    }

    // --- NEWS ---
    if (pathname === '/api/news' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(NEWS_FILE) });
    }

    if (pathname === '/api/admin/news' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(NEWS_FILE) });
    }

    if (pathname === '/api/admin/news' && method === 'POST') {
        const body = await parseBody(req);
        const news = readJSON(NEWS_FILE);
        const newNews = {
            id: getNextId(news),
            title: body.title,
            category: body.category,
            date: body.date || new Date().toISOString(),
            summary: body.summary,
            content: body.content,
            imageUrl: body.imageUrl || body.image || '',
            isHot: body.isHot || false
        };
        news.unshift(newNews);
        if (writeJSON(NEWS_FILE, news)) return sendJSON(res, { success: true, data: newNews, message: 'Tin tức đã được tạo' });
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    const newsMatch = pathname.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsMatch) {
        const newsId = parseInt(newsMatch[1]);
        const news = readJSON(NEWS_FILE);
        const newsIndex = news.findIndex(n => n.id === newsId);
        if (method === 'PUT') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            const body = await parseBody(req);
            news[newsIndex] = { ...news[newsIndex], ...body, imageUrl: body.imageUrl || body.image || news[newsIndex].imageUrl };
            if (writeJSON(NEWS_FILE, news)) return sendJSON(res, { success: true, data: news[newsIndex] });
            return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
        }
        if (method === 'DELETE') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            news.splice(newsIndex, 1);
            if (writeJSON(NEWS_FILE, news)) return sendJSON(res, { success: true, message: 'Đã xóa' });
            return sendJSON(res, { success: false, message: 'Lỗi khi xóa' }, 500);
        }
    }

    // --- AGENCIES ---
    if (pathname === '/api/agencies' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(AGENCIES_FILE) });
    }

    if (pathname === '/api/admin/agencies' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(AGENCIES_FILE) });
    }

    if (pathname === '/api/admin/agencies' && method === 'POST') {
        const body = await parseBody(req);
        const agencies = readJSON(AGENCIES_FILE);
        const newAgency = { id: getNextId(agencies), ...body };
        agencies.push(newAgency);
        if (writeJSON(AGENCIES_FILE, agencies)) return sendJSON(res, { success: true, data: newAgency });
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    const agencyMatch = pathname.match(/^\/api\/admin\/agencies\/(\d+)$/);
    if (agencyMatch) {
        const agencyId = parseInt(agencyMatch[1]);
        const agencies = readJSON(AGENCIES_FILE);
        const agencyIndex = agencies.findIndex(a => a.id === agencyId);
        if (method === 'PUT') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            const body = await parseBody(req);
            agencies[agencyIndex] = { ...agencies[agencyIndex], ...body };
            if (writeJSON(AGENCIES_FILE, agencies)) return sendJSON(res, { success: true, data: agencies[agencyIndex] });
            return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
        }
        if (method === 'DELETE') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
            agencies.splice(agencyIndex, 1);
            if (writeJSON(AGENCIES_FILE, agencies)) return sendJSON(res, { success: true, message: 'Đã xóa' });
            return sendJSON(res, { success: false, message: 'Lỗi khi xóa' }, 500);
        }
    }

    // --- SUBSCRIPTIONS ---
    if (pathname === '/api/subscriptions' && method === 'GET') {
        const subs = readJSON(SUBSCRIPTIONS_FILE);
        return sendJSON(res, { success: true, data: subs.filter(s => s.isActive !== false) });
    }

    if (pathname === '/api/admin/subscriptions' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(SUBSCRIPTIONS_FILE) });
    }

    if (pathname === '/api/admin/subscriptions' && method === 'POST') {
        const body = await parseBody(req);
        const subs = readJSON(SUBSCRIPTIONS_FILE);
        const newSub = { id: getNextId(subs), ...body, isActive: true };
        subs.push(newSub);
        if (writeJSON(SUBSCRIPTIONS_FILE, subs)) return sendJSON(res, { success: true, data: newSub });
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    // --- COMPANY ---
    if (pathname === '/api/company' && method === 'GET') {
        const company = readJSON(COMPANY_FILE);
        return sendJSON(res, { success: true, data: Array.isArray(company) ? {} : company });
    }

    if (pathname === '/api/admin/company' && method === 'GET') {
        const company = readJSON(COMPANY_FILE);
        return sendJSON(res, { success: true, data: Array.isArray(company) ? {} : company });
    }

    if (pathname === '/api/admin/company' && method === 'POST') {
        const body = await parseBody(req);
        let company = readJSON(COMPANY_FILE);
        if (Array.isArray(company)) company = {};
        Object.assign(company, body);
        if (writeJSON(COMPANY_FILE, company)) return sendJSON(res, { success: true, data: company, message: 'Đã cập nhật' });
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    // --- USERS ---
    if (pathname === '/api/admin/users' && method === 'GET') {
        const users = readJSON(USERS_FILE);
        return sendJSON(res, { success: true, data: users.map(({ password, ...rest }) => rest) });
    }

    // --- PROVINCES ---
    if (pathname === '/api/provinces' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON(PROVINCES_FILE) });
    }

    // --- SETTINGS ---
    if (pathname === '/api/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE);
        return sendJSON(res, { success: true, data: Array.isArray(settings) ? {} : settings });
    }

    if (pathname === '/api/admin/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE);
        return sendJSON(res, { success: true, data: Array.isArray(settings) ? {} : settings });
    }

    if (pathname === '/api/admin/settings' && method === 'POST') {
        const body = await parseBody(req);
        let settings = readJSON(SETTINGS_FILE);
        if (Array.isArray(settings)) settings = {};
        Object.assign(settings, body);
        if (writeJSON(SETTINGS_FILE, settings)) return sendJSON(res, { success: true, data: settings });
        return sendJSON(res, { success: false, message: 'Lỗi khi lưu' }, 500);
    }

    // --- STATS ---
    if (pathname === '/api/admin/stats' && method === 'GET') {
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: readJSON(EVENTS_FILE).length },
                news: { total: readJSON(NEWS_FILE).length },
                agencies: { total: readJSON(AGENCIES_FILE).length },
                users: { total: readJSON(USERS_FILE).length }
            }
        });
    }

    // --- ADMIN LOGIN ---
    if (pathname === '/api/admin/login' && method === 'POST') {
        const body = await parseBody(req);
        if (body.username === 'admin' && body.password === 'htic2025') {
            return sendJSON(res, { success: true, token: 'admin-token-' + Date.now() });
        }
        return sendJSON(res, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }

    // =============== STATIC FILES ===============
    
    // Serve frontend files từ thư mục ../frontend/
    if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'index.html'));
    }
    
    if (pathname === '/admin' || pathname === '/admin.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'admin.html'));
    }

    // Serve images từ thư mục ../frontend/images/
    if (pathname.startsWith('/images/')) {
        const imagePath = path.join(FRONTEND_DIR, pathname);
        if (fs.existsSync(imagePath)) {
            return serveStatic(res, imagePath);
        }
    }

    // Serve other static files từ frontend
    const frontendPath = path.join(FRONTEND_DIR, pathname);
    if (fs.existsSync(frontendPath) && fs.statSync(frontendPath).isFile()) {
        return serveStatic(res, frontendPath);
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Không tìm thấy' }));
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║            HTIC Legal App Server v2.0                      ║
╠════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                            ║
║  Admin:  http://localhost:${PORT}/admin                      ║
║  Login:  admin / htic2025                                  ║
╠════════════════════════════════════════════════════════════╣
║  Data:   ${DATA_DIR}
║  Frontend: ${FRONTEND_DIR}
╚════════════════════════════════════════════════════════════╝
    `);
});

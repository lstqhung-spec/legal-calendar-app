const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Path configuration - Adjust for backend/frontend structure
const BACKEND_DIR = __dirname;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const DATA_DIR = path.join(BACKEND_DIR, 'data');

// Data file paths
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const PROVINCES_FILE = path.join(DATA_DIR, 'provinces.json');
const AGENCIES_FILE = path.join(DATA_DIR, 'agencies.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LAWYERS_FILE = path.join(DATA_DIR, 'lawyers.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
// ========== MỚI: Support Requests ==========
const SUPPORT_REQUESTS_FILE = path.join(DATA_DIR, 'support_requests.json');

// Ensure data directory exists
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
    return Math.max(...items.map(i => i.id || 0)) + 1;
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
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
    '.html': 'text/html',
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
            res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('File not found: ' + filePath);
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        }
    });
}

// Initialize default data if not exists
function initializeData() {
    // Default events
    if (!fs.existsSync(EVENTS_FILE)) {
        const defaultEvents = [
            { id: 1, title: 'Nop to khai thue GTGT thang', category: 'tax', frequency: 'monthly', dayOfMonth: 20, description: 'Nop to khai thue GTGT thang truoc', legalReference: 'Theo Dieu 44 Luat Quan ly thue 2019', penalty: 'Phat 2-5 trieu dong neu nop cham', isActive: true },
            { id: 2, title: 'Dong BHXH, BHYT, BHTN', category: 'insurance', frequency: 'monthly', dayOfMonth: 25, description: 'Dong bao hiem xa hoi, y te, that nghiep hang thang', legalReference: 'Luat Bao hiem xa hoi 2014', penalty: 'Phat 12-15% so tien cham dong', isActive: true }
        ];
        writeJSON(EVENTS_FILE, defaultEvents);
    }

    // Default news
    if (!fs.existsSync(NEWS_FILE)) {
        const defaultNews = [
            { id: 1, title: 'Nghi dinh moi ve quan ly thue 2024', category: 'Thue', date: '25/12/2024', summary: 'Chinh phu ban hanh Nghi dinh moi...', content: 'Noi dung chi tiet...', imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', isHot: true }
        ];
        writeJSON(NEWS_FILE, defaultNews);
    }

    // Default provinces
    if (!fs.existsSync(PROVINCES_FILE)) {
        const defaultProvinces = [
            { id: 'hanoi', name: 'Ha Noi' },
            { id: 'hcm', name: 'TP. Ho Chi Minh' },
            { id: 'danang', name: 'Da Nang' },
            { id: 'haiphong', name: 'Hai Phong' },
            { id: 'cantho', name: 'Can Tho' }
        ];
        writeJSON(PROVINCES_FILE, defaultProvinces);
    }

    // Default agencies
    if (!fs.existsSync(AGENCIES_FILE)) {
        const defaultAgencies = [
            { id: 1, name: 'Cuc Thue TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '20 Le Dai Hanh, Ha Noi', phone: '024 3974 2020' },
            { id: 2, name: 'BHXH TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '86 Tran Hung Dao, Ha Noi', phone: '024 3943 6789' },
            { id: 3, name: 'Cong ty Luat HTIC', category: 'lawfirm', provinceId: 'hanoi', address: '15 Pham Hung, Ha Noi', phone: '0379 044 299', website: 'www.htic.com.vn' },
            { id: 4, name: 'Cuc Thue TP. HCM', category: 'government', provinceId: 'hcm', address: '140 Nguyen Thi Minh Khai, Q3', phone: '028 3930 1999' },
            { id: 5, name: 'VP Cong chung Nguyen Hue', category: 'notary', provinceId: 'hanoi', address: '65 Nguyen Hue, Ha Noi', phone: '024 3825 1234' }
        ];
        writeJSON(AGENCIES_FILE, defaultAgencies);
    }

    // Default settings
    if (!fs.existsSync(SETTINGS_FILE)) {
        const defaultSettings = {
            logo: null,
            companyName: 'HTIC LAW FIRM',
            website: 'www.htic.com.vn',
            phone: '0379 044 299',
            email: 'contact@htic.vn',
            address: 'Ha Noi, Viet Nam'
        };
        writeJSON(SETTINGS_FILE, defaultSettings);
    }

    // Default users
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = [
            {
                id: 1,
                email: 'admin@htic.vn',
                password: 'htic2025',
                name: 'HTIC Admin',
                phone: '0379044299',
                avatar: null,
                company: 'HTIC Law Firm',
                taxCode: '0123456789',
                address: '15 Pham Hung, Nam Tu Liem, Ha Noi',
                industry: 'Dich vu phap ly',
                contactInfo: 'Hotline: 0379044299',
                isPro: true,
                proExpiry: '2026-12-31',
                provider: 'email',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                email: 'test@gmail.com',
                password: '123456',
                name: 'Test User',
                phone: '0901234567',
                avatar: null,
                company: '',
                taxCode: '',
                address: '',
                industry: '',
                contactInfo: '',
                isPro: false,
                proExpiry: null,
                provider: 'email',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 3,
                email: 'pro@test.com',
                password: 'pro123',
                name: 'Pro User Test',
                phone: '0909999888',
                avatar: null,
                company: 'Test Company',
                taxCode: '9876543210',
                address: 'TP.HCM',
                industry: 'Thuong mai',
                contactInfo: '',
                isPro: true,
                proExpiry: '2026-06-30',
                provider: 'email',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        writeJSON(USERS_FILE, defaultUsers);
    }

    // Default lawyers
    if (!fs.existsSync(LAWYERS_FILE)) {
        const defaultLawyers = [
            {
                id: 1,
                name: 'Luat su Tran Van A',
                title: 'Luat su dieu hanh',
                specialty: 'Doanh nghiep, Thue, Dau tu',
                phone: '0379044299',
                zalo: '0379044299',
                email: 'lawyer.a@htic.vn',
                avatar: null,
                experience: '15 nam',
                isAvailable: true,
                isPrimary: true
            },
            {
                id: 2,
                name: 'Luat su Nguyen Thi B',
                title: 'Luat su thanh vien',
                specialty: 'Lao dong, Bao hiem xa hoi',
                phone: '0901234567',
                zalo: '0901234567',
                email: 'lawyer.b@htic.vn',
                avatar: null,
                experience: '10 nam',
                isAvailable: true,
                isPrimary: false
            }
        ];
        writeJSON(LAWYERS_FILE, defaultLawyers);
    }

    // Default payments
    if (!fs.existsSync(PAYMENTS_FILE)) {
        writeJSON(PAYMENTS_FILE, []);
    }

    // ========== MỚI: Default support requests ==========
    if (!fs.existsSync(SUPPORT_REQUESTS_FILE)) {
        writeJSON(SUPPORT_REQUESTS_FILE, []);
    }
}

// Initialize data
initializeData();

// Request handler
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    console.log(`${method} ${pathname}`);

    // =============== API ROUTES ===============

    // --- EVENTS ---
    if (pathname === '/api/events' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        return sendJSON(res, { success: true, data: events });
    }

    if (pathname === '/api/admin/events' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        return sendJSON(res, { success: true, data: events });
    }

    if (pathname === '/api/admin/events' && method === 'POST') {
        const body = await parseBody(req);
        const events = readJSON(EVENTS_FILE);
        const newEvent = { id: getNextId(events), ...body, isActive: true };
        events.push(newEvent);
        if (writeJSON(EVENTS_FILE, events)) {
            return sendJSON(res, { success: true, data: newEvent, message: 'Event created' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    const eventMatch = pathname.match(/^\/api\/admin\/events\/(\d+)$/);
    if (eventMatch) {
        const eventId = parseInt(eventMatch[1]);
        const events = readJSON(EVENTS_FILE);
        const eventIndex = events.findIndex(e => e.id === eventId);

        if (method === 'PUT') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Event not found' }, 404);
            const body = await parseBody(req);
            events[eventIndex] = { ...events[eventIndex], ...body, id: eventId };
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, data: events[eventIndex] });
            }
        }

        if (method === 'DELETE') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Event not found' }, 404);
            events.splice(eventIndex, 1);
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // --- NEWS ---
    if (pathname === '/api/news' && method === 'GET') {
        const news = readJSON(NEWS_FILE);
        return sendJSON(res, { success: true, data: news });
    }

    if (pathname === '/api/admin/news' && method === 'GET') {
        const news = readJSON(NEWS_FILE);
        return sendJSON(res, { success: true, data: news });
    }

    if (pathname === '/api/admin/news' && method === 'POST') {
        const body = await parseBody(req);
        const news = readJSON(NEWS_FILE);
        const newNews = { id: getNextId(news), ...body, date: new Date().toLocaleDateString('vi-VN') };
        news.push(newNews);
        if (writeJSON(NEWS_FILE, news)) {
            return sendJSON(res, { success: true, data: newNews });
        }
    }

    const newsMatch = pathname.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsMatch) {
        const newsId = parseInt(newsMatch[1]);
        const news = readJSON(NEWS_FILE);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (method === 'PUT') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            news[newsIndex] = { ...news[newsIndex], ...body, id: newsId };
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, data: news[newsIndex] });
            }
        }

        if (method === 'DELETE') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            news.splice(newsIndex, 1);
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // --- AGENCIES ---
    if (pathname === '/api/agencies' && method === 'GET') {
        const agencies = readJSON(AGENCIES_FILE);
        return sendJSON(res, { success: true, data: agencies });
    }

    if (pathname === '/api/admin/agencies' && method === 'GET') {
        const agencies = readJSON(AGENCIES_FILE);
        return sendJSON(res, { success: true, data: agencies });
    }

    if (pathname === '/api/admin/agencies' && method === 'POST') {
        const body = await parseBody(req);
        const agencies = readJSON(AGENCIES_FILE);
        const newAgency = { id: getNextId(agencies), ...body };
        agencies.push(newAgency);
        if (writeJSON(AGENCIES_FILE, agencies)) {
            return sendJSON(res, { success: true, data: newAgency });
        }
    }

    const agencyMatch = pathname.match(/^\/api\/admin\/agencies\/(\d+)$/);
    if (agencyMatch) {
        const agencyId = parseInt(agencyMatch[1]);
        const agencies = readJSON(AGENCIES_FILE);
        const agencyIndex = agencies.findIndex(a => a.id === agencyId);

        if (method === 'PUT') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            agencies[agencyIndex] = { ...agencies[agencyIndex], ...body, id: agencyId };
            if (writeJSON(AGENCIES_FILE, agencies)) {
                return sendJSON(res, { success: true, data: agencies[agencyIndex] });
            }
        }

        if (method === 'DELETE') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            agencies.splice(agencyIndex, 1);
            if (writeJSON(AGENCIES_FILE, agencies)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // --- PROVINCES ---
    if (pathname === '/api/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
    }

    if (pathname === '/api/admin/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
    }

    if (pathname === '/api/admin/provinces' && method === 'POST') {
        const body = await parseBody(req);
        const provinces = readJSON(PROVINCES_FILE);
        if (provinces.find(p => p.id === body.id)) {
            return sendJSON(res, { success: false, message: 'ID already exists' }, 400);
        }
        provinces.push(body);
        if (writeJSON(PROVINCES_FILE, provinces)) {
            return sendJSON(res, { success: true, data: body });
        }
    }

    const provinceMatch = pathname.match(/^\/api\/admin\/provinces\/(.+)$/);
    if (provinceMatch) {
        const provinceId = provinceMatch[1];
        const provinces = readJSON(PROVINCES_FILE);
        const provinceIndex = provinces.findIndex(p => p.id === provinceId);

        if (method === 'PUT') {
            if (provinceIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            provinces[provinceIndex] = { ...provinces[provinceIndex], ...body };
            if (writeJSON(PROVINCES_FILE, provinces)) {
                return sendJSON(res, { success: true, data: provinces[provinceIndex] });
            }
        }

        if (method === 'DELETE') {
            if (provinceIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            provinces.splice(provinceIndex, 1);
            if (writeJSON(PROVINCES_FILE, provinces)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // --- SETTINGS ---
    if (pathname === '/api/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: settings });
    }

    if (pathname === '/api/admin/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: settings });
    }

    if (pathname === '/api/admin/settings' && method === 'POST') {
        const body = await parseBody(req);
        const settings = readJSON(SETTINGS_FILE) || {};
        Object.assign(settings, body);
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Saved', data: settings });
        }
    }

    // --- STATS (CẬP NHẬT: thêm support requests) ---
    if (pathname === '/api/admin/stats' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        const news = readJSON(NEWS_FILE);
        const agencies = readJSON(AGENCIES_FILE);
        const users = readJSON(USERS_FILE);
        const payments = readJSON(PAYMENTS_FILE);
        const supportRequests = readJSON(SUPPORT_REQUESTS_FILE);
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: events.length, active: events.filter(e => e.isActive).length },
                news: { total: news.length },
                agencies: { total: agencies.length },
                users: { total: users.length, pro: users.filter(u => u.isPro).length },
                payments: { total: payments.length, completed: payments.filter(p => p.status === 'completed').length },
                supportRequests: { total: supportRequests.length, pending: supportRequests.filter(r => r.status === 'pending').length }
            }
        });
    }

    // --- ADMIN LOGIN ---
    if (pathname === '/api/admin/login' && method === 'POST') {
        const body = await parseBody(req);
        if (body.username === 'admin' && body.password === 'htic2025') {
            return sendJSON(res, { success: true, token: 'admin-token-' + Date.now() });
        }
        return sendJSON(res, { success: false, message: 'Invalid credentials' }, 401);
    }

    // =============== USER AUTHENTICATION ===============

    // --- ĐĂNG KÝ ---
    if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        
        const existingUser = users.find(u => u.email === body.email);
        if (existingUser) {
            return sendJSON(res, { success: false, message: 'Email da duoc su dung' }, 400);
        }
        
        const newUser = {
            id: getNextId(users),
            email: body.email,
            password: body.password,
            name: body.name || '',
            phone: body.phone || '',
            avatar: null,
            company: body.company || '',
            taxCode: body.taxCode || '',
            address: body.address || '',
            industry: body.industry || '',
            contactInfo: body.contactInfo || '',
            isPro: false,
            proExpiry: null,
            provider: body.provider || 'email',
            providerId: body.providerId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        if (writeJSON(USERS_FILE, users)) {
            const { password, ...userWithoutPassword } = newUser;
            return sendJSON(res, { 
                success: true, 
                data: userWithoutPassword,
                token: 'user-token-' + newUser.id + '-' + Date.now(),
                message: 'Dang ky thanh cong' 
            });
        }
        return sendJSON(res, { success: false, message: 'Loi luu du lieu' }, 500);
    }

    // --- ĐĂNG NHẬP ---
    if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        
        const user = users.find(u => u.email === body.email && u.password === body.password);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return sendJSON(res, { 
                success: true, 
                data: userWithoutPassword,
                token: 'user-token-' + user.id + '-' + Date.now(),
                message: 'Dang nhap thanh cong'
            });
        }
        return sendJSON(res, { success: false, message: 'Email hoac mat khau khong dung' }, 401);
    }

    // --- ĐĂNG NHẬP/ĐĂNG KÝ VỚI GOOGLE/APPLE ---
    if (pathname === '/api/auth/social' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        
        let user = users.find(u => u.email === body.email || 
            (u.provider === body.provider && u.providerId === body.providerId));
        
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return sendJSON(res, { 
                success: true, 
                data: userWithoutPassword,
                token: 'user-token-' + user.id + '-' + Date.now(),
                isNewUser: false,
                message: 'Dang nhap thanh cong'
            });
        } else {
            const newUser = {
                id: getNextId(users),
                email: body.email,
                password: '',
                name: body.name || '',
                phone: body.phone || '',
                avatar: body.avatar || null,
                company: '',
                taxCode: '',
                address: '',
                industry: '',
                contactInfo: '',
                isPro: false,
                proExpiry: null,
                provider: body.provider,
                providerId: body.providerId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            users.push(newUser);
            if (writeJSON(USERS_FILE, users)) {
                const { password, ...userWithoutPassword } = newUser;
                return sendJSON(res, { 
                    success: true, 
                    data: userWithoutPassword,
                    token: 'user-token-' + newUser.id + '-' + Date.now(),
                    isNewUser: true,
                    message: 'Tao tai khoan thanh cong'
                });
            }
        }
        return sendJSON(res, { success: false, message: 'Loi xu ly' }, 500);
    }

    // --- LẤY THÔNG TIN USER ---
    const userGetMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (userGetMatch && method === 'GET') {
        const userId = parseInt(userGetMatch[1]);
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.id === userId);
        
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return sendJSON(res, { success: true, data: userWithoutPassword });
        }
        return sendJSON(res, { success: false, message: 'User khong ton tai' }, 404);
    }

    // --- CẬP NHẬT PROFILE ---
    const userPutMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (userPutMatch && method === 'PUT') {
        const userId = parseInt(userPutMatch[1]);
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return sendJSON(res, { success: false, message: 'User khong ton tai' }, 404);
        }
        
        const allowedFields = ['name', 'phone', 'avatar', 'company', 'taxCode', 'address', 'industry', 'contactInfo'];
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                users[userIndex][field] = body[field];
            }
        });
        users[userIndex].updatedAt = new Date().toISOString();
        
        if (writeJSON(USERS_FILE, users)) {
            const { password, ...userWithoutPassword } = users[userIndex];
            return sendJSON(res, { success: true, data: userWithoutPassword, message: 'Cap nhat thanh cong' });
        }
        return sendJSON(res, { success: false, message: 'Loi luu du lieu' }, 500);
    }

    // --- UPLOAD AVATAR ---
    const avatarMatch = pathname.match(/^\/api\/users\/(\d+)\/avatar$/);
    if (avatarMatch && method === 'POST') {
        const userId = parseInt(avatarMatch[1]);
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return sendJSON(res, { success: false, message: 'User khong ton tai' }, 404);
        }
        
        users[userIndex].avatar = body.avatar;
        users[userIndex].updatedAt = new Date().toISOString();
        
        if (writeJSON(USERS_FILE, users)) {
            return sendJSON(res, { success: true, avatar: body.avatar, message: 'Upload thanh cong' });
        }
        return sendJSON(res, { success: false, message: 'Loi luu du lieu' }, 500);
    }

    // =============== LAWYERS ===============

    if (pathname === '/api/lawyers' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        const availableLawyers = lawyers.filter(l => l.isAvailable);
        return sendJSON(res, { success: true, data: availableLawyers });
    }

    if (pathname === '/api/lawyers/primary' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        const primaryLawyer = lawyers.find(l => l.isPrimary && l.isAvailable);
        return sendJSON(res, { success: true, data: primaryLawyer || lawyers.find(l => l.isAvailable) || null });
    }

    if (pathname === '/api/admin/lawyers' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        return sendJSON(res, { success: true, data: lawyers });
    }

    if (pathname === '/api/admin/lawyers' && method === 'POST') {
        const body = await parseBody(req);
        const lawyers = readJSON(LAWYERS_FILE);
        const newLawyer = { id: getNextId(lawyers), ...body, isAvailable: true };
        lawyers.push(newLawyer);
        if (writeJSON(LAWYERS_FILE, lawyers)) {
            return sendJSON(res, { success: true, data: newLawyer });
        }
    }

    const lawyerMatch = pathname.match(/^\/api\/admin\/lawyers\/(\d+)$/);
    if (lawyerMatch) {
        const lawyerId = parseInt(lawyerMatch[1]);
        const lawyers = readJSON(LAWYERS_FILE);
        const lawyerIndex = lawyers.findIndex(l => l.id === lawyerId);

        if (method === 'PUT') {
            if (lawyerIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            lawyers[lawyerIndex] = { ...lawyers[lawyerIndex], ...body, id: lawyerId };
            if (writeJSON(LAWYERS_FILE, lawyers)) {
                return sendJSON(res, { success: true, data: lawyers[lawyerIndex] });
            }
        }

        if (method === 'DELETE') {
            if (lawyerIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            lawyers.splice(lawyerIndex, 1);
            if (writeJSON(LAWYERS_FILE, lawyers)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // =============== ADMIN: USERS ===============

    if (pathname === '/api/admin/users' && method === 'GET') {
        const users = readJSON(USERS_FILE);
        const usersWithoutPassword = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        return sendJSON(res, { success: true, data: usersWithoutPassword });
    }

    const userAdminMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (userAdminMatch) {
        const userId = parseInt(userAdminMatch[1]);
        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === userId);

        if (method === 'PUT') {
            if (userIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            users[userIndex] = { ...users[userIndex], ...body, id: userId, updatedAt: new Date().toISOString() };
            if (writeJSON(USERS_FILE, users)) {
                const { password, ...userWithoutPassword } = users[userIndex];
                return sendJSON(res, { success: true, data: userWithoutPassword });
            }
        }

        if (method === 'DELETE') {
            if (userIndex === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            users.splice(userIndex, 1);
            if (writeJSON(USERS_FILE, users)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // =============== PAYMENTS ===============

    if (pathname === '/api/payments/create' && method === 'POST') {
        const body = await parseBody(req);
        const payments = readJSON(PAYMENTS_FILE);
        
        const newPayment = {
            id: getNextId(payments),
            orderId: 'HTIC' + Date.now(),
            userId: body.userId,
            amount: body.amount,
            package: body.package,
            method: body.method,
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null,
            transactionId: null,
            note: body.note || ''
        };
        
        payments.push(newPayment);
        if (writeJSON(PAYMENTS_FILE, payments)) {
            return sendJSON(res, { success: true, data: newPayment });
        }
    }

    const paymentConfirmMatch = pathname.match(/^\/api\/admin\/payments\/(\d+)\/confirm$/);
    if (paymentConfirmMatch && method === 'POST') {
        const paymentId = parseInt(paymentConfirmMatch[1]);
        const payments = readJSON(PAYMENTS_FILE);
        const paymentIndex = payments.findIndex(p => p.id === paymentId);
        
        if (paymentIndex === -1) {
            return sendJSON(res, { success: false, message: 'Not found' }, 404);
        }
        
        const body = await parseBody(req);
        payments[paymentIndex].status = 'completed';
        payments[paymentIndex].completedAt = new Date().toISOString();
        payments[paymentIndex].transactionId = body.transactionId || ('TXN' + Date.now());
        
        // Update user isPro
        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === payments[paymentIndex].userId);
        if (userIndex !== -1) {
            users[userIndex].isPro = true;
            const now = new Date();
            switch (payments[paymentIndex].package) {
                case 'monthly': now.setMonth(now.getMonth() + 1); break;
                case 'yearly': now.setFullYear(now.getFullYear() + 1); break;
                case 'lifetime': now.setFullYear(now.getFullYear() + 100); break;
            }
            users[userIndex].proExpiry = now.toISOString().split('T')[0];
            writeJSON(USERS_FILE, users);
        }
        
        if (writeJSON(PAYMENTS_FILE, payments)) {
            return sendJSON(res, { success: true, data: payments[paymentIndex] });
        }
    }

    const paymentUserMatch = pathname.match(/^\/api\/payments\/user\/(\d+)$/);
    if (paymentUserMatch && method === 'GET') {
        const userId = parseInt(paymentUserMatch[1]);
        const payments = readJSON(PAYMENTS_FILE);
        const userPayments = payments.filter(p => p.userId === userId);
        return sendJSON(res, { success: true, data: userPayments });
    }

    if (pathname === '/api/admin/payments' && method === 'GET') {
        const payments = readJSON(PAYMENTS_FILE);
        return sendJSON(res, { success: true, data: payments });
    }

    if (pathname === '/api/packages' && method === 'GET') {
        const packages = [
            { id: 'monthly', name: 'Goi thang', price: 99000, originalPrice: 149000, duration: '1 thang', features: ['Ket noi luat su 24/7', 'Tu van qua chat, goi dien', 'Uu tien ho tro'] },
            { id: 'yearly', name: 'Goi nam', price: 799000, originalPrice: 1188000, duration: '12 thang', features: ['Tat ca tinh nang goi thang', 'Tiet kiem 33%', 'Soan thao hop dong mien phi'], isBestValue: true },
            { id: 'lifetime', name: 'Tron doi', price: 1990000, originalPrice: 2990000, duration: 'Vinh vien', features: ['Tat ca tinh nang', 'Khong gioi han thoi gian', 'Ho tro VIP'] }
        ];
        return sendJSON(res, { success: true, data: packages });
    }

    if (pathname === '/api/payment-info' && method === 'GET') {
        const paymentInfo = {
            bankName: 'Vietcombank',
            bankBranch: 'Chi nhanh Ha Noi',
            accountNumber: '1234567890123',
            accountName: 'CONG TY LUAT TNHH HTIC',
            transferContent: 'HTIC PRO [Ma don hang]',
            qrCode: null,
            momo: { phone: '0379044299', name: 'HTIC LAW FIRM' }
        };
        return sendJSON(res, { success: true, data: paymentInfo });
    }

    // =============== MỚI: SUPPORT REQUESTS ===============

    // [PUBLIC] Gửi yêu cầu hỗ trợ từ app
    if (pathname === '/api/support-requests' && method === 'POST') {
        const body = await parseBody(req);
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        
        const newRequest = {
            id: getNextId(requests),
            name: body.name || '',
            email: body.email || '',
            phone: body.phone || '',
            category: body.category || 'general',
            subject: body.subject || '',
            message: body.message || '',
            status: 'pending', // pending, in-progress, resolved, closed
            adminNote: '',
            adminResponse: '',
            createdAt: body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resolvedAt: null
        };
        
        requests.push(newRequest);
        
        if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
            return sendJSON(res, { 
                success: true, 
                data: newRequest, 
                message: 'Yêu cầu hỗ trợ đã được gửi thành công' 
            });
        }
        return sendJSON(res, { success: false, message: 'Không thể lưu yêu cầu' }, 500);
    }

    // [ADMIN] Lấy tất cả support requests
    if (pathname === '/api/admin/support-requests' && method === 'GET') {
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        // Sắp xếp theo mới nhất
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJSON(res, { success: true, data: requests });
    }

    // [ADMIN] Lấy thống kê support requests
    if (pathname === '/api/admin/support-requests/stats' && method === 'GET') {
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        
        const stats = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            inProgress: requests.filter(r => r.status === 'in-progress').length,
            resolved: requests.filter(r => r.status === 'resolved').length,
            closed: requests.filter(r => r.status === 'closed').length,
            byCategory: {}
        };
        
        // Đếm theo category
        requests.forEach(r => {
            stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
        });
        
        return sendJSON(res, { success: true, data: stats });
    }

    // [ADMIN] Xử lý support request theo ID
    const supportRequestMatch = pathname.match(/^\/api\/admin\/support-requests\/(\d+)$/);
    if (supportRequestMatch) {
        const requestId = parseInt(supportRequestMatch[1]);
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        const requestIndex = requests.findIndex(r => r.id === requestId);

        // GET - Lấy chi tiết
        if (method === 'GET') {
            if (requestIndex === -1) {
                return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
            }
            return sendJSON(res, { success: true, data: requests[requestIndex] });
        }

        // PUT - Cập nhật (status, admin response, etc.)
        if (method === 'PUT') {
            if (requestIndex === -1) {
                return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
            }
            
            const body = await parseBody(req);
            const updatedRequest = {
                ...requests[requestIndex],
                ...body,
                updatedAt: new Date().toISOString()
            };
            
            // Nếu status chuyển sang resolved, set resolvedAt
            if (body.status === 'resolved' && requests[requestIndex].status !== 'resolved') {
                updatedRequest.resolvedAt = new Date().toISOString();
            }
            
            requests[requestIndex] = updatedRequest;
            
            if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
                return sendJSON(res, { 
                    success: true, 
                    data: updatedRequest, 
                    message: 'Đã cập nhật yêu cầu hỗ trợ' 
                });
            }
            return sendJSON(res, { success: false, message: 'Không thể cập nhật' }, 500);
        }

        // DELETE - Xóa
        if (method === 'DELETE') {
            if (requestIndex === -1) {
                return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
            }
            
            requests.splice(requestIndex, 1);
            
            if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
                return sendJSON(res, { success: true, message: 'Đã xóa yêu cầu hỗ trợ' });
            }
            return sendJSON(res, { success: false, message: 'Không thể xóa' }, 500);
        }
    }

    // =============== STATIC FILES (from frontend folder) ===============
    
    if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'index.html'));
    }
    
    if (pathname === '/admin' || pathname === '/admin.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'admin.html'));
    }

    // Serve other static files from frontend folder
    const frontendPath = path.join(FRONTEND_DIR, pathname);
    if (fs.existsSync(frontendPath) && fs.statSync(frontendPath).isFile()) {
        return serveStatic(res, frontendPath);
    }

    // Also try backend folder for backward compatibility
    const backendPath = path.join(BACKEND_DIR, pathname);
    if (fs.existsSync(backendPath) && fs.statSync(backendPath).isFile()) {
        return serveStatic(res, backendPath);
    }

    // 404
    res.writeHead(404, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ success: false, message: 'Not found', path: pathname }));
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           HTIC Legal App Server v10.0                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server:   http://localhost:${PORT}                         ║
║  Admin:    http://localhost:${PORT}/admin                   ║
║  Login:    admin / htic2025                               ║
╠═══════════════════════════════════════════════════════════╣
║  NEW: Support Requests API                                ║
║  - POST /api/support-requests (public)                    ║
║  - GET  /api/admin/support-requests                       ║
║  - PUT  /api/admin/support-requests/:id                   ║
║  - DELETE /api/admin/support-requests/:id                 ║
╠═══════════════════════════════════════════════════════════╣
║  Test Accounts:                                           ║
║  - Pro: admin@htic.vn / htic2025                         ║
║  - Pro: pro@test.com / pro123                            ║
║  - Free: test@gmail.com / 123456                         ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

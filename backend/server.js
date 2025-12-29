const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const PROVINCES_FILE = path.join(DATA_DIR, 'provinces.json');
const AGENCIES_FILE = path.join(DATA_DIR, 'agencies.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
        'Access-Control-Allow-Headers': 'Content-Type'
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
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
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
            { id: 2, title: 'Dong BHXH, BHYT, BHTN', category: 'insurance', frequency: 'monthly', dayOfMonth: 25, description: 'Dong bao hiem xa hoi, y te, that nghiep hang thang', legalReference: 'Luat Bao hiem xa hoi 2014', penalty: 'Phat 12-15% so tien cham dong', isActive: true },
            { id: 3, title: 'Nop to khai thue TNCN', category: 'tax', frequency: 'monthly', dayOfMonth: 20, description: 'Nop to khai thue thu nhap ca nhan', legalReference: 'Thong tu 111/2013/TT-BTC', penalty: 'Phat 2-5 trieu dong', isActive: true },
            { id: 4, title: 'Bao cao tinh hinh su dung hoa don', category: 'report', frequency: 'quarterly', dayOfMonth: 30, description: 'Bao cao tinh hinh su dung hoa don hang quy', legalReference: 'Nghi dinh 123/2020/ND-CP', penalty: 'Phat 4-8 trieu dong', isActive: true },
            { id: 5, title: 'Nop to khai thue GTGT quy', category: 'tax', frequency: 'quarterly', dayOfMonth: 30, description: 'Nop to khai thue GTGT theo quy', legalReference: 'Luat Thue GTGT', penalty: 'Phat 2-5 trieu dong', isActive: true },
            { id: 6, title: 'Bao cao nam ve Lao dong', category: 'report', frequency: 'yearly', dayOfMonth: 5, month: 1, description: 'Bao cao tinh hinh su dung lao dong nam', legalReference: 'Bo luat Lao dong 2019', penalty: 'Phat 5-10 trieu dong', isActive: true },
            { id: 7, title: 'Nop bao cao tai chinh nam', category: 'report', frequency: 'yearly', dayOfMonth: 30, month: 3, description: 'Nop bao cao tai chinh nam truoc', legalReference: 'Luat Ke toan 2015', penalty: 'Phat 5-10 trieu dong', isActive: true },
            { id: 8, title: 'Quyet toan thue TNDN nam', category: 'tax', frequency: 'yearly', dayOfMonth: 30, month: 3, description: 'Quyet toan thue thu nhap doanh nghiep nam truoc', legalReference: 'Luat Thue TNDN', penalty: 'Phat 2-5 trieu dong', isActive: true },
            { id: 9, title: 'Quyet toan thue TNCN nam', category: 'tax', frequency: 'yearly', dayOfMonth: 30, month: 3, description: 'Quyet toan thue thu nhap ca nhan nam truoc', legalReference: 'Luat Thue TNCN', penalty: 'Phat 2-5 trieu dong', isActive: true },
            { id: 10, title: 'Hop Dai hoi dong co dong thuong nien', category: 'license', frequency: 'yearly', dayOfMonth: 30, month: 4, description: 'To chuc Dai hoi dong co dong thuong nien', legalReference: 'Luat Doanh nghiep 2020', penalty: 'Phat 20-30 trieu dong', isActive: true }
        ];
        writeJSON(EVENTS_FILE, defaultEvents);
    }

    // Default news
    if (!fs.existsSync(NEWS_FILE)) {
        const defaultNews = [
            { id: 1, title: 'Nghi dinh moi ve quan ly thue 2024', category: 'Thue', date: '25/12/2024', summary: 'Chinh phu ban hanh Nghi dinh moi ve quan ly thue, co hieu luc tu 01/01/2025...', content: 'Noi dung chi tiet nghi dinh...', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', isHot: true },
            { id: 2, title: 'Huong dan moi ve BHXH tu 2025', category: 'BHXH', date: '24/12/2024', summary: 'Bo Lao dong ban hanh thong tu huong dan thuc hien Luat Bao hiem xa hoi sua doi...', content: 'Noi dung chi tiet...', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400', isHot: true },
            { id: 3, title: 'Tang muc luong co so tu 01/7/2024', category: 'Lao dong', date: '23/12/2024', summary: 'Muc luong co so moi ap dung tu ngay 01/7/2024 la 2.340.000 dong/thang...', content: 'Chi tiet ve tang luong...', image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', isHot: false },
            { id: 4, title: 'Sua doi Luat Doanh nghiep 2024', category: 'Doanh nghiep', date: '22/12/2024', summary: 'Quoc hoi thong qua Luat sua doi bo sung mot so dieu cua Luat Doanh nghiep...', content: 'Chi tiet luat moi...', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400', isHot: false },
            { id: 5, title: 'Quy dinh moi ve hoa don dien tu', category: 'Thue', date: '21/12/2024', summary: 'Tong cuc Thue ban hanh van ban huong dan ve ap dung hoa don dien tu theo quy dinh moi...', content: 'Huong dan chi tiet...', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400', isHot: false }
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
            { id: 'cantho', name: 'Can Tho' },
            { id: 'binhduong', name: 'Binh Duong' },
            { id: 'dongnai', name: 'Dong Nai' },
            { id: 'nghean', name: 'Nghe An' },
            { id: 'thanhhoa', name: 'Thanh Hoa' },
            { id: 'haiduong', name: 'Hai Duong' }
        ];
        writeJSON(PROVINCES_FILE, defaultProvinces);
    }

    // Default agencies
    if (!fs.existsSync(AGENCIES_FILE)) {
        const defaultAgencies = [
            { id: 1, name: 'Cuc Thue TP. Ha Noi', category: 'tax', provinceId: 'hanoi', address: '20 Le Dai Hanh, Hai Ba Trung, Ha Noi', phone: '024 3974 2020' },
            { id: 2, name: 'BHXH TP. Ha Noi', category: 'insurance', provinceId: 'hanoi', address: '86 Tran Hung Dao, Hoan Kiem, Ha Noi', phone: '024 3943 6789' },
            { id: 3, name: 'Toa an Nhan dan TP. Ha Noi', category: 'court', provinceId: 'hanoi', address: '43 Hai Ba Trung, Hoan Kiem, Ha Noi', phone: '024 3825 3687' },
            { id: 4, name: 'Cong an TP. Ha Noi', category: 'police', provinceId: 'hanoi', address: '87 Tran Hung Dao, Hoan Kiem, Ha Noi', phone: '024 3942 3013' },
            { id: 5, name: 'So KH&DT TP. Ha Noi', category: 'business', provinceId: 'hanoi', address: '16 Cat Linh, Dong Da, Ha Noi', phone: '024 3822 4543' },
            { id: 6, name: 'Cuc Thue TP. HCM', category: 'tax', provinceId: 'hcm', address: '140 Nguyen Thi Minh Khai, Quan 3, TP.HCM', phone: '028 3930 1999' },
            { id: 7, name: 'BHXH TP. HCM', category: 'insurance', provinceId: 'hcm', address: '1 Nguyen Thi Minh Khai, Quan 1, TP.HCM', phone: '028 3829 7959' },
            { id: 8, name: 'Toa an Nhan dan TP. HCM', category: 'court', provinceId: 'hcm', address: '131 Nam Ky Khoi Nghia, Quan 1, TP.HCM', phone: '028 3822 6531' },
            { id: 9, name: 'Cong an TP. HCM', category: 'police', provinceId: 'hcm', address: '268 Tran Hung Dao, Quan 1, TP.HCM', phone: '028 3839 4550' },
            { id: 10, name: 'So KH&DT TP. HCM', category: 'business', provinceId: 'hcm', address: '32 Le Thanh Ton, Quan 1, TP.HCM', phone: '028 3829 5012' },
            { id: 11, name: 'Cuc Thue Da Nang', category: 'tax', provinceId: 'danang', address: '99 Tran Phu, Hai Chau, Da Nang', phone: '0236 3821 234' },
            { id: 12, name: 'BHXH Da Nang', category: 'insurance', provinceId: 'danang', address: '121 Le Loi, Hai Chau, Da Nang', phone: '0236 3810 999' }
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
            email: 'contact@htic.com.vn',
            address: 'Ha Noi, Viet Nam'
        };
        writeJSON(SETTINGS_FILE, defaultSettings);
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
            'Access-Control-Allow-Headers': 'Content-Type'
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
        const newEvent = {
            id: getNextId(events),
            ...body,
            isActive: true
        };
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

        if (method === 'GET') {
            const event = events.find(e => e.id === eventId);
            if (event) return sendJSON(res, { success: true, data: event });
            return sendJSON(res, { success: false, message: 'Event not found' }, 404);
        }

        if (method === 'PUT') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Event not found' }, 404);
            const body = await parseBody(req);
            events[eventIndex] = { ...events[eventIndex], ...body, id: eventId };
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, data: events[eventIndex], message: 'Event updated' });
            }
            return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
        }

        if (method === 'DELETE') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Event not found' }, 404);
            events.splice(eventIndex, 1);
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, message: 'Event deleted' });
            }
            return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
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
        const newNews = {
            id: getNextId(news),
            ...body
        };
        news.push(newNews);
        if (writeJSON(NEWS_FILE, news)) {
            return sendJSON(res, { success: true, data: newNews, message: 'News created' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    const newsMatch = pathname.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsMatch) {
        const newsId = parseInt(newsMatch[1]);
        const news = readJSON(NEWS_FILE);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (method === 'GET') {
            const item = news.find(n => n.id === newsId);
            if (item) return sendJSON(res, { success: true, data: item });
            return sendJSON(res, { success: false, message: 'News not found' }, 404);
        }

        if (method === 'PUT') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'News not found' }, 404);
            const body = await parseBody(req);
            news[newsIndex] = { ...news[newsIndex], ...body, id: newsId };
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, data: news[newsIndex], message: 'News updated' });
            }
            return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
        }

        if (method === 'DELETE') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'News not found' }, 404);
            news.splice(newsIndex, 1);
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, message: 'News deleted' });
            }
            return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
        }
    }

    // --- PROVINCES ---
    if (pathname === '/api/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
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
        const newAgency = {
            id: getNextId(agencies),
            ...body
        };
        agencies.push(newAgency);
        if (writeJSON(AGENCIES_FILE, agencies)) {
            return sendJSON(res, { success: true, data: newAgency, message: 'Agency created' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    const agencyMatch = pathname.match(/^\/api\/admin\/agencies\/(\d+)$/);
    if (agencyMatch && method === 'DELETE') {
        const agencyId = parseInt(agencyMatch[1]);
        const agencies = readJSON(AGENCIES_FILE);
        const agencyIndex = agencies.findIndex(a => a.id === agencyId);
        if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Agency not found' }, 404);
        agencies.splice(agencyIndex, 1);
        if (writeJSON(AGENCIES_FILE, agencies)) {
            return sendJSON(res, { success: true, message: 'Agency deleted' });
        }
        return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
    }

    // --- SETTINGS ---
    if (pathname === '/api/settings/logo' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: { logo: settings.logo } });
    }

    if (pathname === '/api/admin/settings/logo' && method === 'POST') {
        const body = await parseBody(req);
        const settings = readJSON(SETTINGS_FILE) || {};
        settings.logo = body.logo;
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Logo saved' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    if (pathname === '/api/admin/settings/logo' && method === 'DELETE') {
        const settings = readJSON(SETTINGS_FILE) || {};
        settings.logo = null;
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Logo deleted' });
        }
        return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
    }

    if (pathname === '/api/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: settings });
    }

    if (pathname === '/api/admin/settings' && method === 'POST') {
        const body = await parseBody(req);
        const settings = readJSON(SETTINGS_FILE) || {};
        Object.assign(settings, body);
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Settings saved' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    // --- STATS ---
    if (pathname === '/api/admin/stats' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        const news = readJSON(NEWS_FILE);
        const agencies = readJSON(AGENCIES_FILE);
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: events.length, active: events.filter(e => e.isActive).length },
                news: { total: news.length },
                agencies: { total: agencies.length }
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

    // =============== STATIC FILES ===============
    
    // Serve frontend files
    const frontendDir = path.join(__dirname, '..', 'frontend');
    
    if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(frontendDir, 'index.html'));
    }
    
    if (pathname === '/admin' || pathname === '/admin.html') {
        return serveStatic(res, path.join(frontendDir, 'admin.html'));
    }

    // Serve images folder
    if (pathname.startsWith('/images/')) {
        const imagePath = path.join(frontendDir, pathname);
        if (fs.existsSync(imagePath)) {
            return serveStatic(res, imagePath);
        }
    }

    // Serve other static files
    const staticPath = path.join(frontendDir, pathname);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        return serveStatic(res, staticPath);
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║         HTIC Legal App Server v8.4                     ║
╠════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}             ║
║  Admin panel: http://localhost:${PORT}/admin             ║
║  Login: admin / htic2025                               ║
╚════════════════════════════════════════════════════════╝
    `);
});

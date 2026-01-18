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
const LAWYERS_FILE = path.join(DATA_DIR, 'lawyers.json');
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

    // Default agencies - 4 categories: government, lawfirm, notary, bailiff
    if (!fs.existsSync(AGENCIES_FILE)) {
        const defaultAgencies = [
            // ===== CO QUAN NHA NUOC (government) =====
            { id: 1, name: 'Cuc Thue TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '20 Le Dai Hanh, Hai Ba Trung, Ha Noi', phone: '024 3974 2020' },
            { id: 2, name: 'BHXH TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '86 Tran Hung Dao, Hoan Kiem, Ha Noi', phone: '024 3943 6789' },
            { id: 3, name: 'So Ke hoach va Dau tu Ha Noi', category: 'government', provinceId: 'hanoi', address: '16 Cat Linh, Dong Da, Ha Noi', phone: '024 3822 4543' },
            { id: 4, name: 'Cuc Thue TP. HCM', category: 'government', provinceId: 'hcm', address: '140 Nguyen Thi Minh Khai, Quan 3, TP.HCM', phone: '028 3930 1999' },
            { id: 5, name: 'BHXH TP. HCM', category: 'government', provinceId: 'hcm', address: '1 Nguyen Thi Minh Khai, Quan 1, TP.HCM', phone: '028 3829 7959' },
            { id: 6, name: 'So Ke hoach va Dau tu TP.HCM', category: 'government', provinceId: 'hcm', address: '32 Le Thanh Ton, Quan 1, TP.HCM', phone: '028 3829 5012' },
            
            // ===== VAN PHONG LUAT SU / CONG TY LUAT (lawfirm) =====
            { id: 7, name: 'Cong ty Luat HTIC', category: 'lawfirm', provinceId: 'hanoi', address: 'So 15 Pham Hung, Nam Tu Liem, Ha Noi', phone: '0379 044 299', website: 'www.htic.com.vn' },
            { id: 8, name: 'VP Luat su Pham va Lien danh', category: 'lawfirm', provinceId: 'hanoi', address: '28 Lieu Giai, Ba Dinh, Ha Noi', phone: '024 3762 8888' },
            { id: 9, name: 'Cong ty Luat Baker McKenzie', category: 'lawfirm', provinceId: 'hcm', address: 'Tang 12, Saigon Tower, 29 Le Duan, Quan 1', phone: '028 3829 5585', website: 'www.bakermckenzie.com' },
            { id: 10, name: 'VP Luat su Vilaf', category: 'lawfirm', provinceId: 'hcm', address: '6B Ton Duc Thang, Quan 1, TP.HCM', phone: '028 3827 7300', website: 'www.vilaf.com.vn' },
            { id: 11, name: 'Cong ty Luat LNT & Partners', category: 'lawfirm', provinceId: 'hcm', address: 'Tang 16, Vincom Center, 72 Le Thanh Ton, Q1', phone: '028 3821 2357', website: 'www.lntpartners.com' },
            
            // ===== VAN PHONG CONG CHUNG (notary) =====
            { id: 12, name: 'VP Cong chung Nguyen Hue', category: 'notary', provinceId: 'hanoi', address: '65 Nguyen Hue, Hoan Kiem, Ha Noi', phone: '024 3825 1234' },
            { id: 13, name: 'VP Cong chung so 1 Ha Noi', category: 'notary', provinceId: 'hanoi', address: '18 Trang Thi, Hoan Kiem, Ha Noi', phone: '024 3826 5678' },
            { id: 14, name: 'VP Cong chung Tran Van Sy', category: 'notary', provinceId: 'hcm', address: '324 Tran Van Sy, Phu Nhuan, TP.HCM', phone: '028 3847 1111' },
            { id: 15, name: 'VP Cong chung Quan 1', category: 'notary', provinceId: 'hcm', address: '135 Nam Ky Khoi Nghia, Quan 1, TP.HCM', phone: '028 3822 9999' },
            { id: 16, name: 'VP Cong chung Hai Chau', category: 'notary', provinceId: 'danang', address: '56 Bach Dang, Hai Chau, Da Nang', phone: '0236 3888 999' },
            
            // ===== VAN PHONG THUA PHAT LAI (bailiff) =====
            { id: 17, name: 'VP Thua phat lai Quan Cau Giay', category: 'bailiff', provinceId: 'hanoi', address: '125 Xuan Thuy, Cau Giay, Ha Noi', phone: '024 3793 5555' },
            { id: 18, name: 'VP Thua phat lai Ba Dinh', category: 'bailiff', provinceId: 'hanoi', address: '45 Kim Ma, Ba Dinh, Ha Noi', phone: '024 3726 8888' },
            { id: 19, name: 'VP Thua phat lai Quan 1 TP.HCM', category: 'bailiff', provinceId: 'hcm', address: '88 Nguyen Du, Quan 1, TP.HCM', phone: '028 3823 7777' },
            { id: 20, name: 'VP Thua phat lai Binh Thanh', category: 'bailiff', provinceId: 'hcm', address: '200 Xo Viet Nghe Tinh, Binh Thanh, TP.HCM', phone: '028 3512 6666' }
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

    // Default lawyers
    if (!fs.existsSync(LAWYERS_FILE)) {
        const defaultLawyers = [
            { id: 1, name: 'Luat su Nguyen Van An', title: 'Luat su dieu hanh', company: 'Cong ty Luat HTIC', phone: '0901234567', zalo: '0901234567', email: 'nguyenvanan@hticlaw.vn', working_hours: '8:00 - 18:00', working_days: 'Thu 2 - Thu 6', specialization: 'Thue & Ke toan', bio: '15 nam kinh nghiem trong linh vuc thue va ke toan doanh nghiep', avatar_url: '', is_online: true, is_primary: true, is_active: true, sort_order: 1 },
            { id: 2, name: 'Luat su Tran Thi Binh', title: 'Luat su', company: 'Cong ty Luat HTIC', phone: '0907654321', zalo: '0907654321', email: 'tranthibinh@hticlaw.vn', working_hours: '8:00 - 17:30', working_days: 'Thu 2 - Thu 6', specialization: 'Lao dong & Bao hiem', bio: '12 nam kinh nghiem ve luat lao dong va bao hiem xa hoi', avatar_url: '', is_online: true, is_primary: false, is_active: true, sort_order: 2 },
            { id: 3, name: 'Luat su Le Hoang Cuong', title: 'Luat su cao cap', company: 'Cong ty Luat HTIC', phone: '0912345678', zalo: '0912345678', email: 'lehoangcuong@hticlaw.vn', working_hours: '8:30 - 18:00', working_days: 'Thu 2 - Thu 7', specialization: 'Dau tu & Doanh nghiep', bio: '18 nam kinh nghiem tu van dau tu va M&A', avatar_url: '', is_online: true, is_primary: false, is_active: true, sort_order: 3 },
            { id: 4, name: 'Luat su Hoang Van Long', title: 'Luat su', company: 'Cong ty Luat HTIC', phone: '0945678901', zalo: '0945678901', email: 'hoangvanlong@hticlaw.vn', working_hours: '8:00 - 17:00', working_days: 'Thu 2 - Thu 6', specialization: 'Thuong mai quoc te', bio: '16 nam kinh nghiem trong linh vuc xuat nhap khau va thuong mai quoc te', avatar_url: '', is_online: false, is_primary: false, is_active: true, sort_order: 4 },
            { id: 5, name: 'Luat su Bui Van Phuc', title: 'Luat su', company: 'Cong ty Luat HTIC', phone: '0978901234', zalo: '0978901234', email: 'buivanphuc@hticlaw.vn', working_hours: '8:00 - 17:30', working_days: 'Thu 2 - Thu 6', specialization: 'Hanh chinh cong', bio: '9 nam kinh nghiem ve thu tuc hanh chinh va giay phep kinh doanh', avatar_url: '', is_online: true, is_primary: false, is_active: true, sort_order: 5 }
        ];
        writeJSON(LAWYERS_FILE, defaultLawyers);
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

    if (pathname === '/api/admin/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
    }

    if (pathname === '/api/admin/provinces' && method === 'POST') {
        const body = await parseBody(req);
        const provinces = readJSON(PROVINCES_FILE);
        // Check if id already exists
        if (provinces.find(p => p.id === body.id)) {
            return sendJSON(res, { success: false, message: 'Province ID already exists' }, 400);
        }
        provinces.push(body);
        if (writeJSON(PROVINCES_FILE, provinces)) {
            return sendJSON(res, { success: true, data: body, message: 'Province created' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    const provinceMatch = pathname.match(/^\/api\/admin\/provinces\/(.+)$/);
    if (provinceMatch) {
        const provinceId = provinceMatch[1];
        const provinces = readJSON(PROVINCES_FILE);
        const provinceIndex = provinces.findIndex(p => p.id === provinceId);
        
        if (method === 'GET') {
            if (provinceIndex === -1) return sendJSON(res, { success: false, message: 'Province not found' }, 404);
            return sendJSON(res, { success: true, data: provinces[provinceIndex] });
        }
        
        if (method === 'PUT') {
            const body = await parseBody(req);
            if (provinceIndex === -1) return sendJSON(res, { success: false, message: 'Province not found' }, 404);
            provinces[provinceIndex] = { ...provinces[provinceIndex], ...body };
            if (writeJSON(PROVINCES_FILE, provinces)) {
                return sendJSON(res, { success: true, data: provinces[provinceIndex], message: 'Province updated' });
            }
            return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
        }
        
        if (method === 'DELETE') {
            if (provinceIndex === -1) return sendJSON(res, { success: false, message: 'Province not found' }, 404);
            provinces.splice(provinceIndex, 1);
            if (writeJSON(PROVINCES_FILE, provinces)) {
                return sendJSON(res, { success: true, message: 'Province deleted' });
            }
            return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
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

    // --- LAWYERS ---
    if (pathname === '/api/lawyers' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        const activeLawyers = lawyers.filter(l => l.is_active !== false);
        return sendJSON(res, { success: true, data: activeLawyers });
    }

    if (pathname === '/api/admin/lawyers' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        return sendJSON(res, { success: true, data: lawyers });
    }

    if (pathname === '/api/admin/lawyers' && method === 'POST') {
        const body = await parseBody(req);
        const lawyers = readJSON(LAWYERS_FILE);
        const newLawyer = {
            id: getNextId(lawyers),
            name: body.name || '',
            title: body.title || '',
            company: body.company || '',
            phone: body.phone || '',
            zalo: body.zalo || '',
            email: body.email || '',
            working_hours: body.working_hours || '',
            working_days: body.working_days || '',
            specialization: body.specialization || '',
            bio: body.bio || '',
            avatar_url: body.avatar_url || '',
            is_online: body.is_online !== false,
            is_primary: body.is_primary || false,
            is_active: body.is_active !== false,
            sort_order: body.sort_order || lawyers.length + 1
        };
        lawyers.push(newLawyer);
        if (writeJSON(LAWYERS_FILE, lawyers)) {
            return sendJSON(res, { success: true, data: newLawyer, message: 'Lawyer created' });
        }
        return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
    }

    const lawyerMatch = pathname.match(/^\/api\/admin\/lawyers\/(\d+)$/);
    if (lawyerMatch) {
        const lawyerId = parseInt(lawyerMatch[1]);
        const lawyers = readJSON(LAWYERS_FILE);
        const lawyerIndex = lawyers.findIndex(l => l.id === lawyerId);

        if (method === 'GET') {
            const lawyer = lawyers.find(l => l.id === lawyerId);
            if (lawyer) return sendJSON(res, { success: true, data: lawyer });
            return sendJSON(res, { success: false, message: 'Lawyer not found' }, 404);
        }

        if (method === 'PUT') {
            if (lawyerIndex === -1) return sendJSON(res, { success: false, message: 'Lawyer not found' }, 404);
            const body = await parseBody(req);
            lawyers[lawyerIndex] = { 
                ...lawyers[lawyerIndex], 
                ...body, 
                id: lawyerId,
                avatar_url: body.avatar_url || lawyers[lawyerIndex].avatar_url || ''
            };
            if (writeJSON(LAWYERS_FILE, lawyers)) {
                return sendJSON(res, { success: true, data: lawyers[lawyerIndex], message: 'Lawyer updated' });
            }
            return sendJSON(res, { success: false, message: 'Failed to save' }, 500);
        }

        if (method === 'DELETE') {
            if (lawyerIndex === -1) return sendJSON(res, { success: false, message: 'Lawyer not found' }, 404);
            lawyers.splice(lawyerIndex, 1);
            if (writeJSON(LAWYERS_FILE, lawyers)) {
                return sendJSON(res, { success: true, message: 'Lawyer deleted' });
            }
            return sendJSON(res, { success: false, message: 'Failed to delete' }, 500);
        }
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
        const lawyers = readJSON(LAWYERS_FILE);
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: events.length, active: events.filter(e => e.isActive).length },
                news: { total: news.length },
                agencies: { total: agencies.length },
                lawyers: { total: lawyers.length, active: lawyers.filter(l => l.is_active !== false).length, online: lawyers.filter(l => l.is_online).length }
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
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘         HTIC Legal App Server v8.6                     â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Server running at: http://localhost:${PORT}             â•‘
â•‘  Admin panel: http://localhost:${PORT}/admin             â•‘
â•‘  Login: admin / htic2025                               â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    `);
});

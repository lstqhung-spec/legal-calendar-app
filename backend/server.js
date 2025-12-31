const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Data file paths - lưu cùng thư mục với server
const EVENTS_FILE = path.join(__dirname, 'events.json');
const NEWS_FILE = path.join(__dirname, 'news.json');
const PROVINCES_FILE = path.join(__dirname, 'provinces.json');
const AGENCIES_FILE = path.join(__dirname, 'agencies.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const CUSTOMERS_FILE = path.join(__dirname, 'customers.json');

// =============== HELPER FUNCTIONS ===============

function readJSON(file) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error('Lỗi đọc file:', file, e);
    }
    return [];
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Lỗi ghi file:', file, e);
        return false;
    }
}

function getNextId(items) {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map(i => i.id || 0)) + 1;
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
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
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
            res.end('Không tìm thấy file');
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        }
    });
}

// =============== KHỞI TẠO DỮ LIỆU MẪU ===============

function initializeData() {
    // Events mẫu
    if (!fs.existsSync(EVENTS_FILE)) {
        const defaultEvents = [
            { id: 1, title: 'Nộp tờ khai thuế GTGT tháng', category: 'tax', frequency: 'monthly', dayOfMonth: 20, description: 'Nộp tờ khai thuế GTGT tháng trước', legalReference: 'Theo Điều 44 Luật Quản lý thuế 2019', penalty: 'Phạt 2-5 triệu đồng nếu nộp chậm', isActive: true, createdAt: new Date().toISOString() },
            { id: 2, title: 'Đóng BHXH, BHYT, BHTN', category: 'insurance', frequency: 'monthly', dayOfMonth: 25, description: 'Đóng bảo hiểm xã hội, y tế, thất nghiệp hàng tháng', legalReference: 'Luật Bảo hiểm xã hội 2014', penalty: 'Phạt 12-15% số tiền chậm đóng', isActive: true, createdAt: new Date().toISOString() },
            { id: 3, title: 'Nộp tờ khai thuế TNCN', category: 'tax', frequency: 'monthly', dayOfMonth: 20, description: 'Nộp tờ khai thuế thu nhập cá nhân', legalReference: 'Thông tư 111/2013/TT-BTC', penalty: 'Phạt 2-5 triệu đồng', isActive: true, createdAt: new Date().toISOString() },
            { id: 4, title: 'Báo cáo tình hình sử dụng hóa đơn', category: 'report', frequency: 'quarterly', dayOfMonth: 30, description: 'Báo cáo tình hình sử dụng hóa đơn hàng quý', legalReference: 'Nghị định 123/2020/NĐ-CP', penalty: 'Phạt 4-8 triệu đồng', isActive: true, createdAt: new Date().toISOString() },
            { id: 5, title: 'Nộp tờ khai thuế GTGT quý', category: 'tax', frequency: 'quarterly', dayOfMonth: 30, description: 'Nộp tờ khai thuế GTGT theo quý', legalReference: 'Luật Thuế GTGT', penalty: 'Phạt 2-5 triệu đồng', isActive: true, createdAt: new Date().toISOString() },
        ];
        writeJSON(EVENTS_FILE, defaultEvents);
        console.log('✓ Đã tạo dữ liệu mẫu: events.json');
    }

    // News mẫu
    if (!fs.existsSync(NEWS_FILE)) {
        const defaultNews = [
            { id: 1, title: 'Nghị định mới về quản lý thuế 2025', category: 'tax', date: '2024-12-30', summary: 'Chính phủ ban hành Nghị định mới về quản lý thuế, có hiệu lực từ 01/01/2025...', content: '<p>Nội dung chi tiết nghị định về quản lý thuế năm 2025...</p>', image: '', isHot: true, createdAt: new Date().toISOString() },
            { id: 2, title: 'Hướng dẫn mới về BHXH từ 2025', category: 'insurance', date: '2024-12-29', summary: 'Bộ Lao động ban hành thông tư hướng dẫn thực hiện Luật BHXH sửa đổi...', content: '<p>Chi tiết hướng dẫn về bảo hiểm xã hội...</p>', image: '', isHot: true, createdAt: new Date().toISOString() },
            { id: 3, title: 'Tăng mức lương cơ sở từ 01/7/2024', category: 'labor', date: '2024-12-28', summary: 'Mức lương cơ sở mới áp dụng từ ngày 01/7/2024 là 2.340.000 đồng/tháng...', content: '<p>Chi tiết về tăng lương cơ sở...</p>', image: '', isHot: false, createdAt: new Date().toISOString() },
        ];
        writeJSON(NEWS_FILE, defaultNews);
        console.log('✓ Đã tạo dữ liệu mẫu: news.json');
    }

    // Provinces mẫu
    if (!fs.existsSync(PROVINCES_FILE)) {
        const defaultProvinces = [
            { id: 'hcm', name: 'TP. Hồ Chí Minh' },
            { id: 'hanoi', name: 'Hà Nội' },
            { id: 'danang', name: 'Đà Nẵng' },
            { id: 'cantho', name: 'Cần Thơ' },
            { id: 'haiphong', name: 'Hải Phòng' },
            { id: 'binhduong', name: 'Bình Dương' },
            { id: 'dongnai', name: 'Đồng Nai' },
        ];
        writeJSON(PROVINCES_FILE, defaultProvinces);
        console.log('✓ Đã tạo dữ liệu mẫu: provinces.json');
    }

    // Agencies mẫu
    if (!fs.existsSync(AGENCIES_FILE)) {
        const defaultAgencies = [
            { id: 1, name: 'Cục Thuế TP. Hồ Chí Minh', type: 'government', provinceId: 'hcm', address: '140 Nguyễn Thị Minh Khai, Quận 3, TP.HCM', phone: '028 3930 1999', email: 'cucthue@hcm.gov.vn', website: 'https://hcmtax.gov.vn', createdAt: new Date().toISOString() },
            { id: 2, name: 'BHXH TP. Hồ Chí Minh', type: 'government', provinceId: 'hcm', address: '1 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', phone: '028 3829 7959', email: 'bhxh@hcm.gov.vn', website: 'https://bhxhhcm.gov.vn', createdAt: new Date().toISOString() },
            { id: 3, name: 'Văn phòng Luật sư HTIC', type: 'law_firm', provinceId: 'hcm', address: 'Quận Bình Thạnh, TP.HCM', phone: '028 1234 5678', email: 'contact@hticlaw.com', website: 'https://hticlaw.com', createdAt: new Date().toISOString() },
            { id: 4, name: 'VP Công chứng Số 1', type: 'notary', provinceId: 'hcm', address: 'Quận 1, TP.HCM', phone: '028 3823 4567', email: 'congchung1@email.com', website: '', createdAt: new Date().toISOString() },
        ];
        writeJSON(AGENCIES_FILE, defaultAgencies);
        console.log('✓ Đã tạo dữ liệu mẫu: agencies.json');
    }

    // Settings mẫu
    if (!fs.existsSync(SETTINGS_FILE)) {
        const defaultSettings = {
            appName: 'HTIC Legal Calendar',
            logo: '',
            companyName: 'HTIC Law Company',
            companyAddress: 'TP. Hồ Chí Minh, Việt Nam',
            companyPhone: '028 1234 5678',
            companyEmail: 'contact@hticlaw.com',
            companyWebsite: 'https://hticlaw.com',
            primaryColor: '#3B82F6',
            proPrice: 99000,
            updatedAt: new Date().toISOString()
        };
        writeJSON(SETTINGS_FILE, defaultSettings);
        console.log('✓ Đã tạo dữ liệu mẫu: settings.json');
    }

    // Customers mẫu
    if (!fs.existsSync(CUSTOMERS_FILE)) {
        const defaultCustomers = [];
        writeJSON(CUSTOMERS_FILE, defaultCustomers);
        console.log('✓ Đã tạo dữ liệu mẫu: customers.json');
    }
}

// Khởi tạo dữ liệu
initializeData();

// =============== SERVER ===============

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // =============== PUBLIC API ===============

    // --- EVENTS (Lịch pháp lý) ---
    if (pathname === '/api/events' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        const activeEvents = events.filter(e => e.isActive !== false);
        return sendJSON(res, { success: true, data: activeEvents });
    }

    // --- NEWS (Tin tức) - Sắp xếp mới nhất lên đầu ---
    if (pathname === '/api/news' && method === 'GET') {
        const news = readJSON(NEWS_FILE);
        // Sắp xếp theo createdAt giảm dần (mới nhất lên đầu)
        news.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        return sendJSON(res, { success: true, data: news });
    }

    // --- AGENCIES (Cơ quan) ---
    if (pathname === '/api/agencies' && method === 'GET') {
        const agencies = readJSON(AGENCIES_FILE);
        return sendJSON(res, { success: true, data: agencies });
    }

    // --- PROVINCES (Tỉnh thành) ---
    if (pathname === '/api/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
    }

    // --- SETTINGS (Cài đặt công khai) ---
    if (pathname === '/api/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: settings });
    }

    // --- CUSTOMER REGISTER (Đăng ký khách hàng) ---
    if (pathname === '/api/customers/register' && method === 'POST') {
        const body = await parseBody(req);
        const customers = readJSON(CUSTOMERS_FILE);
        
        // Kiểm tra email đã tồn tại
        if (body.email && customers.find(c => c.email === body.email)) {
            return sendJSON(res, { success: false, message: 'Email đã được đăng ký' }, 400);
        }

        const newCustomer = {
            id: getNextId(customers),
            name: body.name || '',
            email: body.email || '',
            phone: body.phone || '',
            company: body.company || '',
            address: body.address || '',
            note: body.note || '',
            source: body.source || 'app',
            isPro: false,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        customers.push(newCustomer);
        if (writeJSON(CUSTOMERS_FILE, customers)) {
            return sendJSON(res, { success: true, data: newCustomer, message: 'Đăng ký thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    // =============== ADMIN API ===============

    // --- ADMIN LOGIN ---
    if (pathname === '/api/admin/login' && method === 'POST') {
        const body = await parseBody(req);
        if (body.username === 'admin' && body.password === 'htic2025') {
            return sendJSON(res, { 
                success: true, 
                token: 'admin-token-' + Date.now(),
                message: 'Đăng nhập thành công'
            });
        }
        return sendJSON(res, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }

    // --- ADMIN STATS (Thống kê) ---
    if (pathname === '/api/admin/stats' && method === 'GET') {
        const events = readJSON(EVENTS_FILE);
        const news = readJSON(NEWS_FILE);
        const agencies = readJSON(AGENCIES_FILE);
        const customers = readJSON(CUSTOMERS_FILE);
        
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: events.length, active: events.filter(e => e.isActive !== false).length },
                news: { total: news.length, hot: news.filter(n => n.isHot).length },
                agencies: { total: agencies.length },
                customers: { total: customers.length, pro: customers.filter(c => c.isPro).length }
            }
        });
    }

    // --- ADMIN EVENTS ---
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
            isActive: body.isActive !== false,
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        if (writeJSON(EVENTS_FILE, events)) {
            return sendJSON(res, { success: true, data: newEvent, message: 'Thêm lịch thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    const eventMatch = pathname.match(/^\/api\/admin\/events\/(\d+)$/);
    if (eventMatch) {
        const eventId = parseInt(eventMatch[1]);
        const events = readJSON(EVENTS_FILE);
        const eventIndex = events.findIndex(e => e.id === eventId);

        if (method === 'PUT') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy lịch' }, 404);
            const body = await parseBody(req);
            events[eventIndex] = { ...events[eventIndex], ...body, updatedAt: new Date().toISOString() };
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, data: events[eventIndex], message: 'Cập nhật thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
        }

        if (method === 'DELETE') {
            if (eventIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy lịch' }, 404);
            events.splice(eventIndex, 1);
            if (writeJSON(EVENTS_FILE, events)) {
                return sendJSON(res, { success: true, message: 'Xóa thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi xóa dữ liệu' }, 500);
        }
    }

    // --- ADMIN NEWS ---
    if (pathname === '/api/admin/news' && method === 'GET') {
        const news = readJSON(NEWS_FILE);
        // Sắp xếp mới nhất lên đầu
        news.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        return sendJSON(res, { success: true, data: news });
    }

    if (pathname === '/api/admin/news' && method === 'POST') {
        const body = await parseBody(req);
        const news = readJSON(NEWS_FILE);
        const newNews = {
            id: getNextId(news),
            title: body.title || '',
            category: body.category || 'general',
            date: body.date || new Date().toISOString().split('T')[0],
            summary: body.summary || '',
            content: body.content || '',
            image: body.image || '',
            source: body.source || '',
            sourceUrl: body.sourceUrl || '',
            isHot: body.isHot || false,
            createdAt: new Date().toISOString()
        };
        news.unshift(newNews); // Thêm vào đầu danh sách
        if (writeJSON(NEWS_FILE, news)) {
            return sendJSON(res, { success: true, data: newNews, message: 'Thêm tin tức thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    const newsMatch = pathname.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsMatch) {
        const newsId = parseInt(newsMatch[1]);
        const news = readJSON(NEWS_FILE);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (method === 'PUT') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy tin tức' }, 404);
            const body = await parseBody(req);
            news[newsIndex] = { ...news[newsIndex], ...body, updatedAt: new Date().toISOString() };
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, data: news[newsIndex], message: 'Cập nhật thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
        }

        if (method === 'DELETE') {
            if (newsIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy tin tức' }, 404);
            news.splice(newsIndex, 1);
            if (writeJSON(NEWS_FILE, news)) {
                return sendJSON(res, { success: true, message: 'Xóa thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi xóa dữ liệu' }, 500);
        }
    }

    // --- ADMIN AGENCIES ---
    if (pathname === '/api/admin/agencies' && method === 'GET') {
        const agencies = readJSON(AGENCIES_FILE);
        return sendJSON(res, { success: true, data: agencies });
    }

    if (pathname === '/api/admin/agencies' && method === 'POST') {
        const body = await parseBody(req);
        const agencies = readJSON(AGENCIES_FILE);
        const newAgency = {
            id: getNextId(agencies),
            ...body,
            createdAt: new Date().toISOString()
        };
        agencies.push(newAgency);
        if (writeJSON(AGENCIES_FILE, agencies)) {
            return sendJSON(res, { success: true, data: newAgency, message: 'Thêm cơ quan thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    const agencyMatch = pathname.match(/^\/api\/admin\/agencies\/(\d+)$/);
    if (agencyMatch) {
        const agencyId = parseInt(agencyMatch[1]);
        const agencies = readJSON(AGENCIES_FILE);
        const agencyIndex = agencies.findIndex(a => a.id === agencyId);

        if (method === 'PUT') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy cơ quan' }, 404);
            const body = await parseBody(req);
            agencies[agencyIndex] = { ...agencies[agencyIndex], ...body, updatedAt: new Date().toISOString() };
            if (writeJSON(AGENCIES_FILE, agencies)) {
                return sendJSON(res, { success: true, data: agencies[agencyIndex], message: 'Cập nhật thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
        }

        if (method === 'DELETE') {
            if (agencyIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy cơ quan' }, 404);
            agencies.splice(agencyIndex, 1);
            if (writeJSON(AGENCIES_FILE, agencies)) {
                return sendJSON(res, { success: true, message: 'Xóa thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi xóa dữ liệu' }, 500);
        }
    }

    // --- ADMIN PROVINCES ---
    if (pathname === '/api/admin/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
    }

    if (pathname === '/api/admin/provinces' && method === 'POST') {
        const body = await parseBody(req);
        const provinces = readJSON(PROVINCES_FILE);
        const newProvince = {
            id: body.id || 'province_' + Date.now(),
            name: body.name || ''
        };
        provinces.push(newProvince);
        if (writeJSON(PROVINCES_FILE, provinces)) {
            return sendJSON(res, { success: true, data: newProvince, message: 'Thêm tỉnh/thành thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    // --- ADMIN CUSTOMERS ---
    if (pathname === '/api/admin/customers' && method === 'GET') {
        const customers = readJSON(CUSTOMERS_FILE);
        // Sắp xếp mới nhất lên đầu
        customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJSON(res, { success: true, data: customers });
    }

    const customerMatch = pathname.match(/^\/api\/admin\/customers\/(\d+)$/);
    if (customerMatch) {
        const customerId = parseInt(customerMatch[1]);
        const customers = readJSON(CUSTOMERS_FILE);
        const customerIndex = customers.findIndex(c => c.id === customerId);

        if (method === 'PUT') {
            if (customerIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy khách hàng' }, 404);
            const body = await parseBody(req);
            customers[customerIndex] = { ...customers[customerIndex], ...body, updatedAt: new Date().toISOString() };
            if (writeJSON(CUSTOMERS_FILE, customers)) {
                return sendJSON(res, { success: true, data: customers[customerIndex], message: 'Cập nhật thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
        }

        if (method === 'DELETE') {
            if (customerIndex === -1) return sendJSON(res, { success: false, message: 'Không tìm thấy khách hàng' }, 404);
            customers.splice(customerIndex, 1);
            if (writeJSON(CUSTOMERS_FILE, customers)) {
                return sendJSON(res, { success: true, message: 'Xóa thành công' });
            }
            return sendJSON(res, { success: false, message: 'Lỗi xóa dữ liệu' }, 500);
        }
    }

    // --- ADMIN SETTINGS ---
    if (pathname === '/api/admin/settings' && method === 'GET') {
        const settings = readJSON(SETTINGS_FILE) || {};
        return sendJSON(res, { success: true, data: settings });
    }

    if (pathname === '/api/admin/settings' && method === 'POST') {
        const body = await parseBody(req);
        let settings = readJSON(SETTINGS_FILE) || {};
        settings = { ...settings, ...body, updatedAt: new Date().toISOString() };
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, data: settings, message: 'Lưu cài đặt thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu dữ liệu' }, 500);
    }

    // --- ADMIN LOGO ---
    if (pathname === '/api/admin/settings/logo' && method === 'POST') {
        const body = await parseBody(req);
        let settings = readJSON(SETTINGS_FILE) || {};
        settings.logo = body.logo || '';
        settings.updatedAt = new Date().toISOString();
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Cập nhật logo thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi lưu logo' }, 500);
    }

    if (pathname === '/api/admin/settings/logo' && method === 'DELETE') {
        let settings = readJSON(SETTINGS_FILE) || {};
        settings.logo = '';
        settings.updatedAt = new Date().toISOString();
        if (writeJSON(SETTINGS_FILE, settings)) {
            return sendJSON(res, { success: true, message: 'Xóa logo thành công' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi xóa logo' }, 500);
    }

    // =============== STATIC FILES ===============

    // Serve admin.html
    if (pathname === '/admin' || pathname === '/admin.html') {
        const adminPath = path.join(__dirname, 'admin.html');
        if (fs.existsSync(adminPath)) {
            return serveStatic(res, adminPath);
        }
    }

    // Serve index.html
    if (pathname === '/' || pathname === '/index.html') {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            return serveStatic(res, indexPath);
        }
        // Trả về JSON nếu không có index.html
        return sendJSON(res, {
            success: true,
            message: 'HTIC Legal Calendar API Server',
            version: '2.0',
            endpoints: {
                events: '/api/events',
                news: '/api/news',
                agencies: '/api/agencies',
                provinces: '/api/provinces',
                settings: '/api/settings',
                admin: '/admin'
            }
        });
    }

    // Serve other static files
    const staticPath = path.join(__dirname, pathname);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        return serveStatic(res, staticPath);
    }

    // 404
    sendJSON(res, { success: false, message: 'Không tìm thấy' }, 404);
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           HTIC Legal Calendar - Admin Server               ║
╠════════════════════════════════════════════════════════════╣
║  🌐 Server đang chạy tại: http://localhost:${PORT}            ║
║  👤 Trang Admin: http://localhost:${PORT}/admin               ║
║  🔑 Đăng nhập: admin / htic2025                            ║
╠════════════════════════════════════════════════════════════╣
║  📡 API Endpoints:                                         ║
║     GET  /api/events      - Lấy danh sách lịch             ║
║     GET  /api/news        - Lấy tin tức (mới nhất đầu)     ║
║     GET  /api/agencies    - Lấy danh sách cơ quan          ║
║     GET  /api/settings    - Lấy cài đặt                    ║
║     POST /api/customers/register - Đăng ký khách hàng      ║
╚════════════════════════════════════════════════════════════╝
    `);
});

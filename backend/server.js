const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Helper functions
const readJSON = (file) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeJSON = (file, data) => {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
};

const sendJSON = (res, data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
};

const parseBody = (req) => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({}); }
    });
});

const getMimeType = (ext) => {
    const types = {
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
    return types[ext] || 'application/octet-stream';
};

// Initialize data files if not exist
const initData = () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    
    const files = {
        'events.json': [
            { id: 1, title: "Nộp tờ khai thuế GTGT", category: "tax", dayOfMonth: 20, frequency: "monthly", description: "Nộp tờ khai thuế GTGT tháng/quý", legalReference: "Luật Quản lý thuế 2019", penalty: "Phạt từ 2-5 triệu đồng", isActive: true, checklist: [{ id: 1, text: "Tập hợp hóa đơn đầu vào" }, { id: 2, text: "Kiểm tra hóa đơn đầu ra" }, { id: 3, text: "Lập tờ khai trên phần mềm HTKK" }, { id: 4, text: "Nộp tờ khai qua thuedientu.gdt.gov.vn", link: "https://thuedientu.gdt.gov.vn" }] },
            { id: 2, title: "Nộp tiền thuế GTGT", category: "tax", dayOfMonth: 20, frequency: "monthly", description: "Nộp tiền thuế GTGT phát sinh", isActive: true, checklist: [{ id: 1, text: "Kiểm tra số thuế phải nộp" }, { id: 2, text: "Chuyển khoản vào tài khoản Kho bạc" }] },
            { id: 3, title: "Nộp BHXH, BHYT, BHTN", category: "insurance", dayOfMonth: 25, frequency: "monthly", description: "Nộp bảo hiểm xã hội, y tế, thất nghiệp", legalReference: "Luật BHXH 2014", penalty: "Phạt 12-15% số tiền chậm nộp/năm", isActive: true, checklist: [{ id: 1, text: "Lập danh sách lao động tham gia" }, { id: 2, text: "Tính số tiền phải nộp" }, { id: 3, text: "Nộp tiền qua ngân hàng" }] },
            { id: 4, title: "Nộp tờ khai thuế TNCN", category: "tax", dayOfMonth: 20, frequency: "monthly", description: "Kê khai thuế thu nhập cá nhân", isActive: true, checklist: [{ id: 1, text: "Tổng hợp thu nhập nhân viên" }, { id: 2, text: "Tính thuế TNCN" }, { id: 3, text: "Nộp tờ khai" }] },
            { id: 5, title: "Báo cáo tình hình sử dụng hóa đơn", category: "report", dayOfMonth: 20, frequency: "quarterly", description: "Báo cáo tình hình sử dụng hóa đơn quý", isActive: true, checklist: [{ id: 1, text: "Thống kê hóa đơn đã sử dụng" }, { id: 2, text: "Lập báo cáo BC26" }, { id: 3, text: "Nộp báo cáo" }] },
            { id: 6, title: "Nộp báo cáo tài chính năm", category: "report", dayOfMonth: 31, month: 3, frequency: "yearly", description: "Nộp báo cáo tài chính năm trước", legalReference: "Luật Kế toán 2015", penalty: "Phạt từ 5-10 triệu đồng", isActive: true, checklist: [{ id: 1, text: "Hoàn thiện sổ sách kế toán" }, { id: 2, text: "Lập bảng cân đối kế toán" }, { id: 3, text: "Lập báo cáo kết quả kinh doanh" }, { id: 4, text: "Nộp qua thuedientu.gdt.gov.vn" }] }
        ],
        'news.json': [
            { id: 1, title: "Hướng dẫn mới về kê khai thuế điện tử", category: "Thuế", summary: "Tổng cục Thuế ban hành hướng dẫn mới về quy trình kê khai thuế điện tử, áp dụng từ 01/01/2025.", date: "28/12/2024", isHot: true, isActive: true, image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400" },
            { id: 2, title: "Thay đổi mức đóng BHXH năm 2025", category: "BHXH", summary: "Mức lương cơ sở tăng lên 2.340.000 đồng, ảnh hưởng đến mức đóng BHXH của doanh nghiệp.", date: "25/12/2024", isHot: true, isActive: true, image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400" },
            { id: 3, title: "Quy định mới về hóa đơn điện tử", category: "Hóa đơn", summary: "Nghị định mới quy định chi tiết về hóa đơn điện tử, có hiệu lực từ tháng 1/2025.", date: "20/12/2024", isHot: false, isActive: true, image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400" },
            { id: 4, title: "Hướng dẫn thành lập doanh nghiệp online", category: "Doanh nghiệp", summary: "Quy trình đăng ký doanh nghiệp trực tuyến đơn giản hóa, rút ngắn thời gian xử lý.", date: "18/12/2024", isHot: false, isActive: true, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" },
            { id: 5, title: "Cập nhật biểu thuế xuất nhập khẩu 2025", category: "Thuế", summary: "Biểu thuế xuất nhập khẩu mới có nhiều thay đổi quan trọng cho doanh nghiệp XNK.", date: "15/12/2024", isHot: false, isActive: true, image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400" }
        ],
        'provinces.json': [
            { id: "hanoi", name: "Hà Nội" },
            { id: "hcm", name: "TP. Hồ Chí Minh" },
            { id: "danang", name: "Đà Nẵng" },
            { id: "haiphong", name: "Hải Phòng" },
            { id: "cantho", name: "Cần Thơ" }
        ],
        'agencies.json': [
            { id: 1, name: "Cục Thuế TP. Hà Nội", provinceId: "hanoi", category: "tax", address: "Số 20 Lý Thường Kiệt, Hoàn Kiếm", phone: "024 3825 2222", isActive: true },
            { id: 2, name: "BHXH TP. Hà Nội", provinceId: "hanoi", category: "insurance", address: "Số 15 Trần Bình Trọng, Hoàn Kiếm", phone: "024 3943 0333", isActive: true },
            { id: 3, name: "Cục Thuế TP. HCM", provinceId: "hcm", category: "tax", address: "Số 63 Hai Bà Trưng, Quận 1", phone: "028 3829 7999", isActive: true },
            { id: 4, name: "BHXH TP. HCM", provinceId: "hcm", category: "insurance", address: "Số 136 Nam Kỳ Khởi Nghĩa, Quận 1", phone: "028 3821 7777", isActive: true },
            { id: 5, name: "Sở KH&ĐT Hà Nội", provinceId: "hanoi", category: "business", address: "Số 16 Cát Linh, Đống Đa", phone: "024 3733 5252", isActive: true }
        ],
        'businesses.json': [],
        'admins.json': [
            { id: 1, username: "admin", password: "htic2025", name: "Admin HTIC" }
        ],
        'settings.json': {
            logo: null,
            appName: "HTIC Legal",
            phone: "0379 044 299",
            email: "contact@htic.com.vn"
        }
    };

    for (const [file, data] of Object.entries(files)) {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) {
            writeJSON(file, data);
        }
    }
};

initData();

// Request handler
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    // ============ SETTINGS API ============
    
    // GET /api/settings/logo - Lấy logo (public)
    if (pathname === '/api/settings/logo' && method === 'GET') {
        const settings = readJSON('settings.json');
        return sendJSON(res, { success: true, data: { logo: settings.logo || null } });
    }

    // POST /api/admin/settings/logo - Upload logo (admin)
    if (pathname === '/api/admin/settings/logo' && method === 'POST') {
        const body = await parseBody(req);
        const settings = readJSON('settings.json');
        settings.logo = body.logo;
        writeJSON('settings.json', settings);
        return sendJSON(res, { success: true, message: 'Logo đã được cập nhật' });
    }

    // DELETE /api/admin/settings/logo - Xóa logo (admin)
    if (pathname === '/api/admin/settings/logo' && method === 'DELETE') {
        const settings = readJSON('settings.json');
        settings.logo = null;
        writeJSON('settings.json', settings);
        return sendJSON(res, { success: true, message: 'Logo đã được xóa' });
    }

    // POST /api/admin/settings/info - Cập nhật thông tin app (admin)
    if (pathname === '/api/admin/settings/info' && method === 'POST') {
        const body = await parseBody(req);
        const settings = readJSON('settings.json');
        if (body.name) settings.appName = body.name;
        if (body.phone) settings.phone = body.phone;
        if (body.email) settings.email = body.email;
        writeJSON('settings.json', settings);
        return sendJSON(res, { success: true, message: 'Thông tin đã được cập nhật' });
    }

    // ============ PUBLIC API ============

    // GET /api/events
    if (pathname === '/api/events' && method === 'GET') {
        const events = readJSON('events.json').filter(e => e.isActive);
        return sendJSON(res, { success: true, data: events });
    }

    // GET /api/news
    if (pathname === '/api/news' && method === 'GET') {
        const news = readJSON('news.json').filter(n => n.isActive);
        return sendJSON(res, { success: true, data: news });
    }

    // GET /api/provinces
    if (pathname === '/api/provinces' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON('provinces.json') });
    }

    // GET /api/agencies
    if (pathname === '/api/agencies' && method === 'GET') {
        const agencies = readJSON('agencies.json').filter(a => a.isActive);
        return sendJSON(res, { success: true, data: agencies });
    }

    // GET /api/businesses
    if (pathname === '/api/businesses' && method === 'GET') {
        const businesses = readJSON('businesses.json').filter(b => b.isActive);
        return sendJSON(res, { success: true, data: businesses });
    }

    // ============ ADMIN API ============

    // POST /api/admin/login
    if (pathname === '/api/admin/login' && method === 'POST') {
        const body = await parseBody(req);
        const admins = readJSON('admins.json');
        const admin = admins.find(a => a.username === body.username && a.password === body.password);
        if (admin) {
            return sendJSON(res, { success: true, token: 'admin-token-' + Date.now(), admin: { name: admin.name } });
        }
        return sendJSON(res, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }

    // GET /api/admin/stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
        return sendJSON(res, {
            success: true,
            data: {
                events: { total: readJSON('events.json').length },
                news: { total: readJSON('news.json').length },
                agencies: { total: readJSON('agencies.json').length },
                businesses: { total: readJSON('businesses.json').length },
                provinces: { total: readJSON('provinces.json').length }
            }
        });
    }

    // ============ ADMIN EVENTS ============
    if (pathname === '/api/admin/events' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON('events.json') });
    }
    if (pathname.match(/^\/api\/admin\/events\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const event = readJSON('events.json').find(e => e.id === id);
        return event ? sendJSON(res, { success: true, data: event }) : sendJSON(res, { success: false }, 404);
    }
    if (pathname === '/api/admin/events' && method === 'POST') {
        const body = await parseBody(req);
        const events = readJSON('events.json');
        body.id = Math.max(0, ...events.map(e => e.id)) + 1;
        events.push(body);
        writeJSON('events.json', events);
        return sendJSON(res, { success: true, data: body });
    }
    if (pathname.match(/^\/api\/admin\/events\/\d+$/) && method === 'PUT') {
        const id = parseInt(pathname.split('/').pop());
        const body = await parseBody(req);
        let events = readJSON('events.json');
        events = events.map(e => e.id === id ? { ...e, ...body } : e);
        writeJSON('events.json', events);
        return sendJSON(res, { success: true });
    }
    if (pathname.match(/^\/api\/admin\/events\/\d+$/) && method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop());
        let events = readJSON('events.json');
        events = events.filter(e => e.id !== id);
        writeJSON('events.json', events);
        return sendJSON(res, { success: true });
    }

    // ============ ADMIN NEWS ============
    if (pathname === '/api/admin/news' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON('news.json') });
    }
    if (pathname.match(/^\/api\/admin\/news\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const news = readJSON('news.json').find(n => n.id === id);
        return news ? sendJSON(res, { success: true, data: news }) : sendJSON(res, { success: false }, 404);
    }
    if (pathname === '/api/admin/news' && method === 'POST') {
        const body = await parseBody(req);
        const news = readJSON('news.json');
        body.id = Math.max(0, ...news.map(n => n.id)) + 1;
        news.unshift(body);
        writeJSON('news.json', news);
        return sendJSON(res, { success: true, data: body });
    }
    if (pathname.match(/^\/api\/admin\/news\/\d+$/) && method === 'PUT') {
        const id = parseInt(pathname.split('/').pop());
        const body = await parseBody(req);
        let news = readJSON('news.json');
        news = news.map(n => n.id === id ? { ...n, ...body } : n);
        writeJSON('news.json', news);
        return sendJSON(res, { success: true });
    }
    if (pathname.match(/^\/api\/admin\/news\/\d+$/) && method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop());
        let news = readJSON('news.json');
        news = news.filter(n => n.id !== id);
        writeJSON('news.json', news);
        return sendJSON(res, { success: true });
    }

    // ============ ADMIN AGENCIES ============
    if (pathname === '/api/admin/agencies' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON('agencies.json') });
    }
    if (pathname.match(/^\/api\/admin\/agencies\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const agency = readJSON('agencies.json').find(a => a.id === id);
        return agency ? sendJSON(res, { success: true, data: agency }) : sendJSON(res, { success: false }, 404);
    }
    if (pathname === '/api/admin/agencies' && method === 'POST') {
        const body = await parseBody(req);
        const agencies = readJSON('agencies.json');
        body.id = Math.max(0, ...agencies.map(a => a.id)) + 1;
        agencies.push(body);
        writeJSON('agencies.json', agencies);
        return sendJSON(res, { success: true, data: body });
    }
    if (pathname.match(/^\/api\/admin\/agencies\/\d+$/) && method === 'PUT') {
        const id = parseInt(pathname.split('/').pop());
        const body = await parseBody(req);
        let agencies = readJSON('agencies.json');
        agencies = agencies.map(a => a.id === id ? { ...a, ...body } : a);
        writeJSON('agencies.json', agencies);
        return sendJSON(res, { success: true });
    }
    if (pathname.match(/^\/api\/admin\/agencies\/\d+$/) && method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop());
        let agencies = readJSON('agencies.json');
        agencies = agencies.filter(a => a.id !== id);
        writeJSON('agencies.json', agencies);
        return sendJSON(res, { success: true });
    }

    // ============ ADMIN BUSINESSES ============
    if (pathname === '/api/admin/businesses' && method === 'GET') {
        return sendJSON(res, { success: true, data: readJSON('businesses.json') });
    }
    if (pathname.match(/^\/api\/admin\/businesses\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const biz = readJSON('businesses.json').find(b => b.id === id);
        return biz ? sendJSON(res, { success: true, data: biz }) : sendJSON(res, { success: false }, 404);
    }
    if (pathname === '/api/admin/businesses' && method === 'POST') {
        const body = await parseBody(req);
        const businesses = readJSON('businesses.json');
        body.id = Math.max(0, ...businesses.map(b => b.id || 0)) + 1;
        businesses.push(body);
        writeJSON('businesses.json', businesses);
        return sendJSON(res, { success: true, data: body });
    }
    if (pathname.match(/^\/api\/admin\/businesses\/\d+$/) && method === 'PUT') {
        const id = parseInt(pathname.split('/').pop());
        const body = await parseBody(req);
        let businesses = readJSON('businesses.json');
        businesses = businesses.map(b => b.id === id ? { ...b, ...body } : b);
        writeJSON('businesses.json', businesses);
        return sendJSON(res, { success: true });
    }
    if (pathname.match(/^\/api\/admin\/businesses\/\d+$/) && method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop());
        let businesses = readJSON('businesses.json');
        businesses = businesses.filter(b => b.id !== id);
        writeJSON('businesses.json', businesses);
        return sendJSON(res, { success: true });
    }

    // ============ ADMIN PROVINCES ============
    if (pathname === '/api/admin/provinces' && method === 'POST') {
        const body = await parseBody(req);
        const provinces = readJSON('provinces.json');
        if (!provinces.find(p => p.id === body.id)) {
            provinces.push(body);
            writeJSON('provinces.json', provinces);
        }
        return sendJSON(res, { success: true });
    }
    if (pathname.match(/^\/api\/admin\/provinces\/[^/]+$/) && method === 'DELETE') {
        const id = pathname.split('/').pop();
        let provinces = readJSON('provinces.json');
        provinces = provinces.filter(p => p.id !== id);
        writeJSON('provinces.json', provinces);
        return sendJSON(res, { success: true });
    }

    // ============ STATIC FILES ============
    let filePath = pathname === '/' ? '/index.html' : pathname;
    if (pathname === '/admin' || pathname === '/admin/') filePath = '/admin.html';
    
    const fullPath = path.join(__dirname, '..', 'frontend', filePath);
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath);
        res.writeHead(200, { 'Content-Type': getMimeType(ext) });
        return fs.createReadStream(fullPath).pipe(res);
    }

    // 404
    sendJSON(res, { success: false, message: 'Not found' }, 404);
});

server.listen(PORT, () => {
    console.log(`🚀 HTIC Legal Server running at http://localhost:${PORT}`);
    console.log(`📱 User App: http://localhost:${PORT}`);
    console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
});

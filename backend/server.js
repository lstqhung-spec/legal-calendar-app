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

function sendHTML(res, html, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(html);
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
    if (!fs.existsSync(EVENTS_FILE)) {
        const defaultEvents = [
            { id: 1, title: 'Nop to khai thue GTGT thang', category: 'tax', frequency: 'monthly', dayOfMonth: 20, description: 'Nop to khai thue GTGT thang truoc', legalReference: 'Theo Dieu 44 Luat Quan ly thue 2019', penalty: 'Phat 2-5 trieu dong neu nop cham', isActive: true },
            { id: 2, title: 'Dong BHXH, BHYT, BHTN', category: 'insurance', frequency: 'monthly', dayOfMonth: 25, description: 'Dong bao hiem xa hoi, y te, that nghiep hang thang', legalReference: 'Luat Bao hiem xa hoi 2014', penalty: 'Phat 12-15% so tien cham dong', isActive: true }
        ];
        writeJSON(EVENTS_FILE, defaultEvents);
    }

    if (!fs.existsSync(NEWS_FILE)) {
        const defaultNews = [
            { id: 1, title: 'Nghi dinh moi ve quan ly thue 2024', category: 'Thue', date: '25/12/2024', summary: 'Chinh phu ban hanh Nghi dinh moi...', content: 'Noi dung chi tiet...', imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', isHot: true }
        ];
        writeJSON(NEWS_FILE, defaultNews);
    }

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

    if (!fs.existsSync(AGENCIES_FILE)) {
        const defaultAgencies = [
            { id: 1, name: 'Cuc Thue TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '20 Le Dai Hanh, Ha Noi', phone: '024 3974 2020' },
            { id: 2, name: 'BHXH TP. Ha Noi', category: 'government', provinceId: 'hanoi', address: '86 Tran Hung Dao, Ha Noi', phone: '024 3943 6789' }
        ];
        writeJSON(AGENCIES_FILE, defaultAgencies);
    }

    if (!fs.existsSync(SETTINGS_FILE)) {
        const defaultSettings = {
            logo: null,
            companyName: 'HTIC LAW FIRM',
            website: 'www.htic.com.vn',
            phone: '0918 682 879',
            email: 'contact@htic.com.vn',
            address: '79/6 Hoang Van Thai, P. Tan My, TP.HCM'
        };
        writeJSON(SETTINGS_FILE, defaultSettings);
    }

    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = [
            { id: 1, email: 'admin@htic.vn', password: 'htic2025', name: 'HTIC Admin', phone: '0918682879', isPro: true, proExpiry: '2026-12-31', provider: 'email', createdAt: new Date().toISOString() }
        ];
        writeJSON(USERS_FILE, defaultUsers);
    }

    if (!fs.existsSync(LAWYERS_FILE)) {
        const defaultLawyers = [
            { id: 1, name: 'Luật sư Trần Văn Hùng', title: 'Luật sư điều hành', specialty: 'Doanh nghiệp, Thuế, Đầu tư', phone: '0918682879', email: 'contact@htic.com.vn', experience: '15 năm', isAvailable: true, isPrimary: true }
        ];
        writeJSON(LAWYERS_FILE, defaultLawyers);
    }

    if (!fs.existsSync(PAYMENTS_FILE)) {
        writeJSON(PAYMENTS_FILE, []);
    }

    if (!fs.existsSync(SUPPORT_REQUESTS_FILE)) {
        writeJSON(SUPPORT_REQUESTS_FILE, []);
    }
}

initializeData();

// =============== LEGAL PAGES HTML ===============

function getPrivacyPolicyHTML() {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chính Sách Bảo Mật - Lịch Pháp Lý HTIC</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.8; color: #333; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
        h1 { color: #3B82F6; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        h2 { color: #1e3a5f; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #3B82F6; font-size: 20px; }
        h3 { color: #2563EB; margin: 20px 0 10px 0; font-size: 16px; }
        p { margin-bottom: 15px; text-align: justify; }
        ul { margin: 15px 0 15px 30px; }
        li { margin-bottom: 8px; }
        .highlight { background: #EFF6FF; padding: 15px 20px; border-left: 4px solid #3B82F6; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .contact-box { background: linear-gradient(135deg, #3B82F6, #60A5FA); color: white; padding: 25px; border-radius: 12px; margin-top: 30px; }
        .contact-box h3 { color: white; margin-top: 0; }
        .contact-box a { color: #FEF08A; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Chính Sách Bảo Mật</h1>
        <p class="subtitle">Ứng dụng Lịch Pháp Lý - HTIC | Cập nhật: Tháng 1/2026</p>
        <div class="highlight"><strong>Cam kết:</strong> CÔNG TY LUẬT TNHH HTIC cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng.</div>
        
        <h2>1. Thông Tin Thu Thập</h2>
        <h3>1.1 Thông tin bạn cung cấp</h3>
        <ul>
            <li><strong>Thông tin liên hệ:</strong> Họ tên, số điện thoại, email khi gửi yêu cầu tư vấn</li>
            <li><strong>Nội dung yêu cầu:</strong> Các câu hỏi, vấn đề pháp lý cần tư vấn</li>
        </ul>
        <h3>1.2 Thông tin tự động</h3>
        <ul>
            <li><strong>Dữ liệu thiết bị:</strong> Loại thiết bị, hệ điều hành, phiên bản app</li>
            <li><strong>Dữ liệu sử dụng:</strong> Các tính năng sử dụng, thời gian dùng</li>
        </ul>
        <h3>1.3 KHÔNG thu thập</h3>
        <ul>
            <li>Thông tin tài chính, số tài khoản ngân hàng</li>
            <li>Vị trí GPS chính xác</li>
        </ul>

        <h2>2. Mục Đích Sử Dụng</h2>
        <ul>
            <li>Cung cấp và cải thiện dịch vụ</li>
            <li>Gửi thông báo nhắc nhở deadline</li>
            <li>Phản hồi yêu cầu tư vấn và hỗ trợ</li>
        </ul>

        <h2>3. Chia Sẻ Thông Tin</h2>
        <p>Chúng tôi <strong>KHÔNG</strong> bán, cho thuê hoặc chia sẻ thông tin cá nhân với bên thứ ba vì mục đích thương mại.</p>

        <h2>4. Bảo Mật</h2>
        <ul>
            <li>Mã hóa dữ liệu (SSL/TLS)</li>
            <li>Lưu trữ trên máy chủ bảo mật</li>
            <li>Hạn chế quyền truy cập</li>
        </ul>

        <h2>5. Quyền Người Dùng</h2>
        <ul>
            <li><strong>Truy cập:</strong> Yêu cầu xem thông tin lưu trữ</li>
            <li><strong>Chỉnh sửa:</strong> Yêu cầu sửa thông tin không chính xác</li>
            <li><strong>Xóa:</strong> Yêu cầu xóa dữ liệu cá nhân</li>
        </ul>

        <h2>6. Trẻ Em</h2>
        <p>Ứng dụng không dành cho trẻ em dưới 13 tuổi.</p>

        <h2>7. Thay Đổi</h2>
        <p>Chúng tôi có thể cập nhật Chính sách này. Thay đổi sẽ được thông báo qua ứng dụng.</p>

        <h2>8. Liên Hệ</h2>
        <div class="contact-box">
            <h3>📞 CÔNG TY LUẬT TNHH HTIC</h3>
            <p>📍 79/6 Hoàng Văn Thái, Khu TTTM Tài chính Quốc tế C4-1, Kp 1, P. Tân Mỹ, TP.HCM</p>
            <p>📧 <a href="mailto:contact@htic.com.vn">contact@htic.com.vn</a></p>
            <p>📱 <a href="tel:0918682879">0918 682 879</a></p>
            <p>🌐 <a href="https://htic.com.vn">htic.com.vn</a></p>
        </div>
        <div class="footer">© 2026 CÔNG TY LUẬT TNHH HTIC | Lịch Pháp Lý v1.0.0</div>
    </div>
</body>
</html>`;
}

function getTermsHTML() {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Điều Khoản Sử Dụng - Lịch Pháp Lý HTIC</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.8; color: #333; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
        h1 { color: #3B82F6; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        h2 { color: #1e3a5f; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #3B82F6; font-size: 20px; }
        p { margin-bottom: 15px; text-align: justify; }
        ul { margin: 15px 0 15px 30px; }
        li { margin-bottom: 8px; }
        .highlight { background: #EFF6FF; padding: 15px 20px; border-left: 4px solid #3B82F6; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .warning { background: #FEF3C7; padding: 15px 20px; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .contact-box { background: linear-gradient(135deg, #3B82F6, #60A5FA); color: white; padding: 25px; border-radius: 12px; margin-top: 30px; }
        .contact-box h3 { color: white; margin-top: 0; }
        .contact-box a { color: #FEF08A; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Điều Khoản Sử Dụng</h1>
        <p class="subtitle">Ứng dụng Lịch Pháp Lý - HTIC | Cập nhật: Tháng 1/2026</p>
        <div class="highlight"><strong>Lưu ý:</strong> Bằng việc sử dụng ứng dụng, bạn đồng ý tuân thủ các điều khoản dưới đây.</div>

        <h2>1. Giới Thiệu</h2>
        <p>Ứng dụng Lịch Pháp Lý được phát triển bởi CÔNG TY LUẬT TNHH HTIC, cung cấp công cụ quản lý nghĩa vụ pháp lý, nhắc nhở deadline và cập nhật tin tức pháp luật.</p>

        <h2>2. Chấp Nhận Điều Khoản</h2>
        <p>Khi tải, cài đặt hoặc sử dụng Ứng dụng, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các Điều khoản này.</p>

        <h2>3. Dịch Vụ</h2>
        <ul>
            <li>Lịch các nghĩa vụ pháp lý doanh nghiệp</li>
            <li>Nhắc nhở deadline trước 1, 3, 7 ngày</li>
            <li>Cập nhật tin tức pháp luật mới</li>
            <li>Kết nối tư vấn với luật sư HTIC</li>
        </ul>

        <h2>4. Tài Khoản</h2>
        <ul>
            <li>Có thể sử dụng không cần đăng ký</li>
            <li>Một số tính năng yêu cầu đăng nhập</li>
            <li>Bạn chịu trách nhiệm bảo mật tài khoản</li>
        </ul>

        <h2>5. Sở Hữu Trí Tuệ</h2>
        <p>Tất cả nội dung trong Ứng dụng thuộc quyền sở hữu của HTIC hoặc được cấp phép hợp pháp.</p>

        <h2>6. Giới Hạn Trách Nhiệm</h2>
        <div class="warning"><strong>⚠️ Quan trọng:</strong> Thông tin trong Ứng dụng chỉ mang tính chất tham khảo, không thay thế tư vấn pháp lý chuyên nghiệp.</div>
        <ul>
            <li>Ứng dụng cung cấp "nguyên trạng"</li>
            <li>Không đảm bảo hoạt động không gián đoạn</li>
            <li>Người dùng tự kiểm tra với cơ quan có thẩm quyền</li>
        </ul>

        <h2>7. Hành Vi Bị Cấm</h2>
        <ul>
            <li>Sử dụng cho mục đích bất hợp pháp</li>
            <li>Truy cập trái phép hệ thống</li>
            <li>Phát tán virus, malware</li>
            <li>Thu thập thông tin người dùng khác</li>
        </ul>

        <h2>8. Thay Đổi</h2>
        <p>Chúng tôi có quyền thay đổi Điều khoản bất cứ lúc nào. Tiếp tục sử dụng đồng nghĩa chấp nhận thay đổi.</p>

        <h2>9. Luật Áp Dụng</h2>
        <p>Điều khoản được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp giải quyết tại Tòa án TP. Hồ Chí Minh.</p>

        <h2>10. Liên Hệ</h2>
        <div class="contact-box">
            <h3>📞 CÔNG TY LUẬT TNHH HTIC</h3>
            <p>📍 79/6 Hoàng Văn Thái, Khu TTTM Tài chính Quốc tế C4-1, Kp 1, P. Tân Mỹ, TP.HCM</p>
            <p>📧 <a href="mailto:contact@htic.com.vn">contact@htic.com.vn</a></p>
            <p>📱 <a href="tel:0918682879">0918 682 879</a></p>
            <p>🌐 <a href="https://htic.com.vn">htic.com.vn</a></p>
        </div>
        <div class="footer">© 2026 CÔNG TY LUẬT TNHH HTIC | Lịch Pháp Lý v1.0.0</div>
    </div>
</body>
</html>`;
}

function getAboutHTML() {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giới Thiệu - Lịch Pháp Lý HTIC</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.8; color: #333; background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; color: white; padding: 40px 20px; }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin-bottom: 20px; }
        .card h2 { color: #3B82F6; margin-bottom: 15px; font-size: 20px; display: flex; align-items: center; gap: 10px; }
        .card p { margin-bottom: 12px; color: #4B5563; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px; }
        .feature { background: #F0F9FF; padding: 20px; border-radius: 12px; text-align: center; }
        .feature-icon { font-size: 32px; margin-bottom: 10px; }
        .feature h3 { color: #1E40AF; font-size: 14px; margin-bottom: 5px; }
        .feature p { font-size: 12px; color: #6B7280; }
        .contact-info { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 25px; border-radius: 12px; margin-top: 20px; }
        .contact-info h3 { margin-bottom: 15px; }
        .contact-info p { margin-bottom: 8px; opacity: 0.95; }
        .contact-info a { color: #FEF08A; }
        .version { text-align: center; color: white; opacity: 0.8; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Lịch Pháp Lý</h1>
            <p>Ứng dụng quản lý nghĩa vụ pháp lý cho doanh nghiệp</p>
        </div>

        <div class="card">
            <h2>🏢 Về HTIC Group</h2>
            <p><strong>HTIC GROUP</strong> là tập đoàn đa ngành tại Việt Nam, hoạt động trong hai lĩnh vực cốt lõi: <strong>Tư vấn Pháp lý</strong> và <strong>Giải pháp Công nghệ</strong>.</p>
            <p>Với đội ngũ luật sư giàu kinh nghiệm hơn <strong>15 năm</strong>, HTIC Law Firm chuyên cung cấp dịch vụ tư vấn pháp luật doanh nghiệp, M&A, thuế và hỗ trợ pháp lý cho doanh nghiệp FDI.</p>
        </div>

        <div class="card">
            <h2>📱 Về Ứng Dụng</h2>
            <p>Lịch Pháp Lý giúp doanh nghiệp không bao giờ bỏ lỡ deadline quan trọng về thuế, bảo hiểm xã hội, báo cáo lao động và các nghĩa vụ pháp lý khác.</p>
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">📅</div>
                    <h3>Lịch Pháp Lý</h3>
                    <p>Đầy đủ deadline thuế, BHXH</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔔</div>
                    <h3>Nhắc Nhở</h3>
                    <p>Thông báo 1, 3, 7 ngày</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📰</div>
                    <h3>Tin Tức</h3>
                    <p>Pháp luật mới nhất</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">👨‍⚖️</div>
                    <h3>Tư Vấn</h3>
                    <p>Kết nối luật sư</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>📞 Liên Hệ</h2>
            <div class="contact-info">
                <h3>CÔNG TY LUẬT TNHH HTIC</h3>
                <p>📍 79/6 Hoàng Văn Thái, Khu TTTM Tài chính Quốc tế C4-1, Kp 1, P. Tân Mỹ, TP.HCM</p>
                <p>📧 <a href="mailto:contact@htic.com.vn">contact@htic.com.vn</a></p>
                <p>📱 <a href="tel:0918682879">0918 682 879</a></p>
                <p>🌐 <a href="https://htic.com.vn">htic.com.vn</a></p>
            </div>
        </div>

        <div class="version">
            <p>Phiên bản 1.0.0 | © 2026 HTIC Group</p>
        </div>
    </div>
</body>
</html>`;
}

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

    // =============== LEGAL PAGES (PUBLIC) ===============
    
    if (pathname === '/privacy-policy' && method === 'GET') {
        return sendHTML(res, getPrivacyPolicyHTML());
    }

    if (pathname === '/terms' && method === 'GET') {
        return sendHTML(res, getTermsHTML());
    }

    if (pathname === '/about' && method === 'GET') {
        return sendHTML(res, getAboutHTML());
    }

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

    // --- PROVINCES ---
    if (pathname === '/api/provinces' && method === 'GET') {
        const provinces = readJSON(PROVINCES_FILE);
        return sendJSON(res, { success: true, data: provinces });
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

    // --- STATS ---
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

    if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        
        if (users.find(u => u.email === body.email)) {
            return sendJSON(res, { success: false, message: 'Email da duoc su dung' }, 400);
        }
        
        const newUser = {
            id: getNextId(users),
            email: body.email,
            password: body.password,
            name: body.name || '',
            phone: body.phone || '',
            isPro: false,
            proExpiry: null,
            provider: body.provider || 'email',
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        if (writeJSON(USERS_FILE, users)) {
            const { password, ...userWithoutPassword } = newUser;
            return sendJSON(res, { success: true, data: userWithoutPassword, token: 'user-token-' + newUser.id });
        }
        return sendJSON(res, { success: false, message: 'Loi luu du lieu' }, 500);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email === body.email && u.password === body.password);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return sendJSON(res, { success: true, data: userWithoutPassword, token: 'user-token-' + user.id });
        }
        return sendJSON(res, { success: false, message: 'Email hoac mat khau khong dung' }, 401);
    }

    // =============== LAWYERS ===============

    if (pathname === '/api/lawyers' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        return sendJSON(res, { success: true, data: lawyers.filter(l => l.isAvailable) });
    }

    if (pathname === '/api/lawyers/primary' && method === 'GET') {
        const lawyers = readJSON(LAWYERS_FILE);
        const primary = lawyers.find(l => l.isPrimary && l.isAvailable);
        return sendJSON(res, { success: true, data: primary || lawyers[0] || null });
    }

    // =============== ADMIN: USERS ===============

    if (pathname === '/api/admin/users' && method === 'GET') {
        const users = readJSON(USERS_FILE);
        return sendJSON(res, { success: true, data: users.map(u => { const { password, ...rest } = u; return rest; }) });
    }

    // =============== SUPPORT REQUESTS ===============

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
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        requests.push(newRequest);
        if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
            return sendJSON(res, { success: true, data: newRequest, message: 'Yêu cầu đã được gửi' });
        }
        return sendJSON(res, { success: false, message: 'Lỗi' }, 500);
    }

    if (pathname === '/api/admin/support-requests' && method === 'GET') {
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJSON(res, { success: true, data: requests });
    }

    const supportMatch = pathname.match(/^\/api\/admin\/support-requests\/(\d+)$/);
    if (supportMatch) {
        const reqId = parseInt(supportMatch[1]);
        const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
        const idx = requests.findIndex(r => r.id === reqId);

        if (method === 'PUT') {
            if (idx === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            const body = await parseBody(req);
            requests[idx] = { ...requests[idx], ...body, updatedAt: new Date().toISOString() };
            if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
                return sendJSON(res, { success: true, data: requests[idx] });
            }
        }

        if (method === 'DELETE') {
            if (idx === -1) return sendJSON(res, { success: false, message: 'Not found' }, 404);
            requests.splice(idx, 1);
            if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
                return sendJSON(res, { success: true, message: 'Deleted' });
            }
        }
    }

    // =============== STATIC FILES ===============
    
    if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'index.html'));
    }
    
    if (pathname === '/admin' || pathname === '/admin.html') {
        return serveStatic(res, path.join(FRONTEND_DIR, 'admin.html'));
    }

    const frontendPath = path.join(FRONTEND_DIR, pathname);
    if (fs.existsSync(frontendPath) && fs.statSync(frontendPath).isFile()) {
        return serveStatic(res, frontendPath);
    }

    const backendPath = path.join(BACKEND_DIR, pathname);
    if (fs.existsSync(backendPath) && fs.statSync(backendPath).isFile()) {
        return serveStatic(res, backendPath);
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, message: 'Not found', path: pathname }));
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           HTIC Legal App Server v10.1                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server:   http://localhost:${PORT}                         ║
║  Admin:    http://localhost:${PORT}/admin                   ║
║  Login:    admin / htic2025                               ║
╠═══════════════════════════════════════════════════════════╣
║  NEW: Legal Pages (for App Store/Play Store)              ║
║  - GET /privacy-policy                                    ║
║  - GET /terms                                             ║
║  - GET /about                                             ║
╠═══════════════════════════════════════════════════════════╣
║  Support Requests API                                     ║
║  - POST /api/support-requests                             ║
║  - GET  /api/admin/support-requests                       ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const frontendDir = path.join(__dirname, '..', 'frontend');

// ============ HELPER FUNCTIONS ============

// Doc du lieu tu file JSON
const readData = (filename) => {
    try {
        const filepath = path.join(dataDir, filename);
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Loi doc file ${filename}:`, error.message);
        return [];
    }
};

// Ghi du lieu vao file JSON
const writeData = (filename, data) => {
    try {
        const filepath = path.join(dataDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Loi ghi file ${filename}:`, error.message);
        return false;
    }
};

// Parse JSON body tu request
const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
};

// Tra ve JSON response
const sendJSON = (res, statusCode, data) => {
    res.writeHead(statusCode, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
};

// Tra ve file tinh (HTML, CSS, JS, images)
const serveStatic = (res, filepath, contentType) => {
    fs.readFile(filepath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
};

// Xac dinh content type theo extension
const getContentType = (ext) => {
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    return types[ext] || 'text/plain';
};

// Tao ID moi
const generateId = (items) => {
    if (items.length === 0) return 1;
    return Math.max(...items.map(item => item.id)) + 1;
};

// ============ API HANDLERS ============

// --- PROVINCES ---
const handleProvinces = (req, res, method) => {
    const provinces = readData('provinces.json');
    
    if (method === 'GET') {
        sendJSON(res, 200, { success: true, data: provinces });
    }
};

// --- AGENCIES ---
const handleAgencies = (req, res, method, urlParts, body) => {
    let agencies = readData('agencies.json');
    const id = urlParts[3] ? parseInt(urlParts[3]) : null;
    const provinceId = new URL(req.url, `http://localhost`).searchParams.get('province');
    
    if (method === 'GET') {
        if (id) {
            const agency = agencies.find(a => a.id === id);
            if (agency) {
                sendJSON(res, 200, { success: true, data: agency });
            } else {
                sendJSON(res, 404, { success: false, message: 'Khong tim thay co quan' });
            }
        } else {
            let result = agencies.filter(a => a.isActive);
            if (provinceId) {
                result = result.filter(a => a.provinceId === provinceId);
            }
            sendJSON(res, 200, { success: true, data: result });
        }
    }
};

// --- ADMIN AGENCIES ---
const handleAdminAgencies = async (req, res, method, urlParts, body) => {
    let agencies = readData('agencies.json');
    const id = urlParts[4] ? parseInt(urlParts[4]) : null;
    
    if (method === 'GET') {
        if (id) {
            const agency = agencies.find(a => a.id === id);
            sendJSON(res, 200, { success: true, data: agency });
        } else {
            sendJSON(res, 200, { success: true, data: agencies });
        }
    } else if (method === 'POST') {
        const newAgency = {
            id: generateId(agencies),
            ...body,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        agencies.push(newAgency);
        writeData('agencies.json', agencies);
        sendJSON(res, 201, { success: true, data: newAgency, message: 'Them co quan thanh cong' });
    } else if (method === 'PUT' && id) {
        const index = agencies.findIndex(a => a.id === id);
        if (index !== -1) {
            agencies[index] = { ...agencies[index], ...body, updatedAt: new Date().toISOString() };
            writeData('agencies.json', agencies);
            sendJSON(res, 200, { success: true, data: agencies[index], message: 'Cap nhat thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay co quan' });
        }
    } else if (method === 'DELETE' && id) {
        const index = agencies.findIndex(a => a.id === id);
        if (index !== -1) {
            agencies.splice(index, 1);
            writeData('agencies.json', agencies);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay co quan' });
        }
    }
};

// --- EVENTS ---
const handleEvents = (req, res, method, urlParts) => {
    const events = readData('events.json');
    
    if (method === 'GET') {
        const activeEvents = events.filter(e => e.isActive);
        sendJSON(res, 200, { success: true, data: activeEvents });
    }
};

// --- ADMIN EVENTS ---
const handleAdminEvents = async (req, res, method, urlParts, body) => {
    let events = readData('events.json');
    const id = urlParts[4] ? parseInt(urlParts[4]) : null;
    
    if (method === 'GET') {
        if (id) {
            const event = events.find(e => e.id === id);
            sendJSON(res, 200, { success: true, data: event });
        } else {
            sendJSON(res, 200, { success: true, data: events });
        }
    } else if (method === 'POST') {
        const newEvent = {
            id: generateId(events),
            ...body,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        writeData('events.json', events);
        sendJSON(res, 201, { success: true, data: newEvent, message: 'Them su kien thanh cong' });
    } else if (method === 'PUT' && id) {
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events[index] = { ...events[index], ...body, updatedAt: new Date().toISOString() };
            writeData('events.json', events);
            sendJSON(res, 200, { success: true, data: events[index], message: 'Cap nhat thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay su kien' });
        }
    } else if (method === 'DELETE' && id) {
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events.splice(index, 1);
            writeData('events.json', events);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay su kien' });
        }
    }
};

// --- NEWS ---
const handleNews = (req, res, method, urlParts) => {
    const news = readData('news.json');
    const id = urlParts[3] ? parseInt(urlParts[3]) : null;
    
    if (method === 'GET') {
        if (id) {
            const article = news.find(n => n.id === id && n.isActive);
            if (article) {
                sendJSON(res, 200, { success: true, data: article });
            } else {
                sendJSON(res, 404, { success: false, message: 'Khong tim thay bai viet' });
            }
        } else {
            const activeNews = news.filter(n => n.isActive).sort((a, b) => new Date(b.date) - new Date(a.date));
            sendJSON(res, 200, { success: true, data: activeNews });
        }
    }
};

// --- ADMIN NEWS ---
const handleAdminNews = async (req, res, method, urlParts, body) => {
    let news = readData('news.json');
    const id = urlParts[4] ? parseInt(urlParts[4]) : null;
    
    if (method === 'GET') {
        if (id) {
            const article = news.find(n => n.id === id);
            sendJSON(res, 200, { success: true, data: article });
        } else {
            sendJSON(res, 200, { success: true, data: news });
        }
    } else if (method === 'POST') {
        const newArticle = {
            id: generateId(news),
            ...body,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        news.push(newArticle);
        writeData('news.json', news);
        sendJSON(res, 201, { success: true, data: newArticle, message: 'Them bai viet thanh cong' });
    } else if (method === 'PUT' && id) {
        const index = news.findIndex(n => n.id === id);
        if (index !== -1) {
            news[index] = { ...news[index], ...body, updatedAt: new Date().toISOString() };
            writeData('news.json', news);
            sendJSON(res, 200, { success: true, data: news[index], message: 'Cap nhat thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay bai viet' });
        }
    } else if (method === 'DELETE' && id) {
        const index = news.findIndex(n => n.id === id);
        if (index !== -1) {
            news.splice(index, 1);
            writeData('news.json', news);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay bai viet' });
        }
    }
};

// --- BUSINESSES ---
const handleBusinesses = (req, res, method, urlParts) => {
    const businesses = readData('businesses.json');
    
    if (method === 'GET') {
        const activeBusinesses = businesses.filter(b => b.isActive);
        sendJSON(res, 200, { success: true, data: activeBusinesses });
    }
};

// --- ADMIN BUSINESSES ---
const handleAdminBusinesses = async (req, res, method, urlParts, body) => {
    let businesses = readData('businesses.json');
    const id = urlParts[4] ? parseInt(urlParts[4]) : null;
    
    if (method === 'GET') {
        if (id) {
            const business = businesses.find(b => b.id === id);
            sendJSON(res, 200, { success: true, data: business });
        } else {
            sendJSON(res, 200, { success: true, data: businesses });
        }
    } else if (method === 'POST') {
        const newBusiness = {
            id: generateId(businesses),
            ...body,
            verified: false,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        businesses.push(newBusiness);
        writeData('businesses.json', businesses);
        sendJSON(res, 201, { success: true, data: newBusiness, message: 'Them doanh nghiep thanh cong' });
    } else if (method === 'PUT' && id) {
        const index = businesses.findIndex(b => b.id === id);
        if (index !== -1) {
            businesses[index] = { ...businesses[index], ...body, updatedAt: new Date().toISOString() };
            writeData('businesses.json', businesses);
            sendJSON(res, 200, { success: true, data: businesses[index], message: 'Cap nhat thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay doanh nghiep' });
        }
    } else if (method === 'DELETE' && id) {
        const index = businesses.findIndex(b => b.id === id);
        if (index !== -1) {
            businesses.splice(index, 1);
            writeData('businesses.json', businesses);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay doanh nghiep' });
        }
    }
};

// --- USERS ---
const handleAdminUsers = async (req, res, method, urlParts, body) => {
    let users = readData('users.json');
    const id = urlParts[4] ? parseInt(urlParts[4]) : null;
    
    if (method === 'GET') {
        if (id) {
            const user = users.find(u => u.id === id);
            sendJSON(res, 200, { success: true, data: user });
        } else {
            // Khong tra ve password
            const safeUsers = users.map(u => {
                const { password, ...rest } = u;
                return rest;
            });
            sendJSON(res, 200, { success: true, data: safeUsers });
        }
    } else if (method === 'DELETE' && id) {
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users.splice(index, 1);
            writeData('users.json', users);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay nguoi dung' });
        }
    }
};

// --- USER REGISTRATION ---
const handleUserRegister = async (req, res, body) => {
    let users = readData('users.json');
    
    // Kiem tra email da ton tai
    if (users.find(u => u.email === body.email)) {
        sendJSON(res, 400, { success: false, message: 'Email da duoc su dung' });
        return;
    }
    
    const newUser = {
        id: generateId(users),
        ...body,
        isPro: false,
        isActive: true,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeData('users.json', users);
    
    const { password, ...safeUser } = newUser;
    sendJSON(res, 201, { success: true, data: safeUser, message: 'Dang ky thanh cong' });
};

// --- USER LOGIN ---
const handleUserLogin = async (req, res, body) => {
    const users = readData('users.json');
    const user = users.find(u => u.email === body.email && u.password === body.password);
    
    if (user) {
        const { password, ...safeUser } = user;
        sendJSON(res, 200, { success: true, data: safeUser, message: 'Dang nhap thanh cong' });
    } else {
        sendJSON(res, 401, { success: false, message: 'Email hoac mat khau khong dung' });
    }
};

// --- ADMIN LOGIN ---
const handleAdminLogin = async (req, res, body) => {
    const admins = readData('admins.json');
    const admin = admins.find(a => a.username === body.username && a.password === body.password);
    
    if (admin) {
        const { password, ...safeAdmin } = admin;
        sendJSON(res, 200, { success: true, data: safeAdmin, message: 'Dang nhap thanh cong' });
    } else {
        sendJSON(res, 401, { success: false, message: 'Sai ten dang nhap hoac mat khau' });
    }
};

// --- STATISTICS ---
const handleAdminStats = (req, res) => {
    const events = readData('events.json');
    const news = readData('news.json');
    const agencies = readData('agencies.json');
    const businesses = readData('businesses.json');
    const users = readData('users.json');
    const provinces = readData('provinces.json');
    
    const stats = {
        events: { total: events.length, active: events.filter(e => e.isActive).length },
        news: { total: news.length, active: news.filter(n => n.isActive).length },
        agencies: { total: agencies.length, active: agencies.filter(a => a.isActive).length },
        businesses: { total: businesses.length, verified: businesses.filter(b => b.verified).length },
        users: { total: users.length, pro: users.filter(u => u.isPro).length },
        provinces: { total: provinces.length }
    };
    
    sendJSON(res, 200, { success: true, data: stats });
};

// --- PROVINCES ADMIN ---
const handleAdminProvinces = async (req, res, method, urlParts, body) => {
    let provinces = readData('provinces.json');
    const id = urlParts[4] || null;
    
    if (method === 'GET') {
        sendJSON(res, 200, { success: true, data: provinces });
    } else if (method === 'POST') {
        const newProvince = {
            id: body.id,
            name: body.name,
            region: body.region || 'other'
        };
        provinces.push(newProvince);
        writeData('provinces.json', provinces);
        sendJSON(res, 201, { success: true, data: newProvince, message: 'Them tinh/thanh thanh cong' });
    } else if (method === 'PUT' && id) {
        const index = provinces.findIndex(p => p.id === id);
        if (index !== -1) {
            provinces[index] = { ...provinces[index], ...body };
            writeData('provinces.json', provinces);
            sendJSON(res, 200, { success: true, data: provinces[index], message: 'Cap nhat thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay tinh/thanh' });
        }
    } else if (method === 'DELETE' && id) {
        const index = provinces.findIndex(p => p.id === id);
        if (index !== -1) {
            provinces.splice(index, 1);
            writeData('provinces.json', provinces);
            sendJSON(res, 200, { success: true, message: 'Xoa thanh cong' });
        } else {
            sendJSON(res, 404, { success: false, message: 'Khong tim thay tinh/thanh' });
        }
    }
};

// ============ MAIN SERVER ============
const server = http.createServer(async (req, res) => {
    const method = req.method;
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const urlParts = pathname.split('/').filter(Boolean);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Parse body for POST/PUT
    let body = {};
    if (method === 'POST' || method === 'PUT') {
        try {
            body = await parseBody(req);
        } catch (e) {
            sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
            return;
        }
    }
    
    // ============ ROUTING ============
    
    // API Routes
    if (urlParts[0] === 'api') {
        
        // Public APIs
        if (urlParts[1] === 'provinces') {
            handleProvinces(req, res, method);
        } else if (urlParts[1] === 'agencies') {
            handleAgencies(req, res, method, urlParts, body);
        } else if (urlParts[1] === 'events') {
            handleEvents(req, res, method, urlParts);
        } else if (urlParts[1] === 'news') {
            handleNews(req, res, method, urlParts);
        } else if (urlParts[1] === 'businesses') {
            handleBusinesses(req, res, method, urlParts);
        } else if (urlParts[1] === 'register' && method === 'POST') {
            await handleUserRegister(req, res, body);
        } else if (urlParts[1] === 'login' && method === 'POST') {
            await handleUserLogin(req, res, body);
        }
        
        // Admin APIs
        else if (urlParts[1] === 'admin') {
            if (urlParts[2] === 'login' && method === 'POST') {
                await handleAdminLogin(req, res, body);
            } else if (urlParts[2] === 'stats') {
                handleAdminStats(req, res);
            } else if (urlParts[2] === 'provinces') {
                await handleAdminProvinces(req, res, method, urlParts, body);
            } else if (urlParts[2] === 'agencies') {
                await handleAdminAgencies(req, res, method, urlParts, body);
            } else if (urlParts[2] === 'events') {
                await handleAdminEvents(req, res, method, urlParts, body);
            } else if (urlParts[2] === 'news') {
                await handleAdminNews(req, res, method, urlParts, body);
            } else if (urlParts[2] === 'businesses') {
                await handleAdminBusinesses(req, res, method, urlParts, body);
            } else if (urlParts[2] === 'users') {
                await handleAdminUsers(req, res, method, urlParts, body);
            } else {
                sendJSON(res, 404, { success: false, message: 'API not found' });
            }
        }
        
        else {
            sendJSON(res, 404, { success: false, message: 'API not found' });
        }
        
        return;
    }
    
    // Static Files
    let filepath;
    if (pathname === '/' || pathname === '/index.html') {
        filepath = path.join(frontendDir, 'index.html');
    } else if (pathname === '/admin' || pathname === '/admin.html') {
        filepath = path.join(frontendDir, 'admin.html');
    } else {
        filepath = path.join(frontendDir, pathname);
    }
    
    const ext = path.extname(filepath);
    const contentType = getContentType(ext || '.html');
    
    serveStatic(res, filepath, contentType);
});

// Start server
server.listen(PORT, () => {
    console.log('========================================');
    console.log(`  HTIC LEGAL APP SERVER`);
    console.log(`  Dang chay tai: http://localhost:${PORT}`);
    console.log('========================================');
    console.log(`  App nguoi dung: http://localhost:${PORT}/`);
    console.log(`  Trang Admin:    http://localhost:${PORT}/admin`);
    console.log('========================================');
});

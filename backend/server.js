// =======================================================
// CẬP NHẬT SERVER.JS - THÊM SUPPORT REQUESTS API
// =======================================================
// Copy các đoạn code sau vào file server.js của bạn

// 1. THÊM VÀO PHẦN KHAI BÁO DATA FILE PATHS (dòng 9-13)
// -----------------------------------------------------
const SUPPORT_REQUESTS_FILE = path.join(DATA_DIR, 'support_requests.json');

// 2. THÊM VÀO PHẦN KHỞI TẠO DATA (sau dòng 175)
// -----------------------------------------------------
// Initialize support requests file
if (!fs.existsSync(SUPPORT_REQUESTS_FILE)) {
    writeJSON(SUPPORT_REQUESTS_FILE, []);
}

// 3. THÊM CÁC API ENDPOINTS CHO SUPPORT REQUESTS (thêm trước phần STATIC FILES)
// -----------------------------------------------------

// --- SUPPORT REQUESTS ---

// [PUBLIC] Submit support request from app
// POST /api/support-requests
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

// [ADMIN] Get all support requests
// GET /api/admin/support-requests
if (pathname === '/api/admin/support-requests' && method === 'GET') {
    const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
    // Sort by newest first
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJSON(res, { success: true, data: requests });
}

// [ADMIN] Get support request by ID
// GET /api/admin/support-requests/:id
const supportRequestMatch = pathname.match(/^\/api\/admin\/support-requests\/(\d+)$/);
if (supportRequestMatch && method === 'GET') {
    const requestId = parseInt(supportRequestMatch[1]);
    const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
        return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
    }
    return sendJSON(res, { success: true, data: request });
}

// [ADMIN] Update support request (change status, add response)
// PUT /api/admin/support-requests/:id
if (supportRequestMatch && method === 'PUT') {
    const requestId = parseInt(supportRequestMatch[1]);
    const body = await parseBody(req);
    const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
    }
    
    // Update fields
    const updatedRequest = {
        ...requests[requestIndex],
        ...body,
        updatedAt: new Date().toISOString()
    };
    
    // If status changed to resolved, set resolvedAt
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

// [ADMIN] Delete support request
// DELETE /api/admin/support-requests/:id
if (supportRequestMatch && method === 'DELETE') {
    const requestId = parseInt(supportRequestMatch[1]);
    const requests = readJSON(SUPPORT_REQUESTS_FILE) || [];
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        return sendJSON(res, { success: false, message: 'Không tìm thấy yêu cầu' }, 404);
    }
    
    requests.splice(requestIndex, 1);
    
    if (writeJSON(SUPPORT_REQUESTS_FILE, requests)) {
        return sendJSON(res, { success: true, message: 'Đã xóa yêu cầu hỗ trợ' });
    }
    return sendJSON(res, { success: false, message: 'Không thể xóa' }, 500);
}

// [ADMIN] Get support requests stats
// GET /api/admin/support-requests/stats
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
    
    // Count by category
    requests.forEach(r => {
        stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    });
    
    return sendJSON(res, { success: true, data: stats });
}

// 4. CẬP NHẬT STATS ENDPOINT (cập nhật phần /api/admin/stats)
// -----------------------------------------------------
// Thêm support requests vào stats
if (pathname === '/api/admin/stats' && method === 'GET') {
    const events = readJSON(EVENTS_FILE);
    const news = readJSON(NEWS_FILE);
    const agencies = readJSON(AGENCIES_FILE);
    const supportRequests = readJSON(SUPPORT_REQUESTS_FILE) || [];
    
    return sendJSON(res, {
        success: true,
        data: {
            events: { total: events.length, active: events.filter(e => e.isActive).length },
            news: { total: news.length },
            agencies: { total: agencies.length },
            supportRequests: {
                total: supportRequests.length,
                pending: supportRequests.filter(r => r.status === 'pending').length
            }
        }
    });
}

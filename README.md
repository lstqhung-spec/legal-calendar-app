# 🚂 HTIC Legal Calendar - Backend v18.0 (Security Hardened)

## 🔐 BẢO MẬT QUAN TRỌNG

### Environment Variables (BẮT BUỘC cho Production)

Thêm các biến môi trường sau vào Railway/Server:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Admin credentials - BẮT BUỘC đổi trong production!
ADMIN_USER=admin
ADMIN_PASS_HASH=<bcrypt_hash_của_password>

# JWT Secret - BẮT BUỘC đổi trong production!
JWT_SECRET=<random_string_32_chars>

# CORS (optional)
ALLOWED_ORIGINS=https://lca.htic.com.vn,https://your-domain.com

# Environment
NODE_ENV=production
```

### Tạo Password Hash

```bash
# Chạy lệnh này để tạo hash cho password của bạn
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### Tạo JWT Secret

```bash
# Tạo random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📦 Cài đặt

```
railway_deploy/
├── server.js           # Backend API với PostgreSQL
├── package.json        # Dependencies
├── public/
│   └── index.html      # Admin Dashboard
└── README.md           # Hướng dẫn này
```

## 🚀 Hướng dẫn Deploy lên Railway

### Bước 1: Tạo GitHub Repository

1. Vào GitHub → Create new repository
2. Đặt tên: `htic-legal-calendar-api`
3. Chọn **Private** (tùy chọn)
4. Click **Create repository**

### Bước 2: Push code lên GitHub

```bash
# Clone repo về máy
git clone https://github.com/YOUR_USERNAME/htic-legal-calendar-api.git
cd htic-legal-calendar-api

# Copy các file từ railway_deploy vào đây
# (server.js, package.json, public/index.html)

# Commit và push
git add .
git commit -m "Initial commit - HTIC Legal Calendar API v11"
git push origin main
```

### Bước 3: Tạo Project trên Railway

1. Vào https://railway.app → Login với GitHub
2. Click **New Project**
3. Chọn **Deploy from GitHub repo**
4. Chọn repo `htic-legal-calendar-api`
5. Railway sẽ tự động detect và deploy

### Bước 4: Thêm PostgreSQL Database

1. Trong project → Click **+ New**
2. Chọn **Database** → **Add PostgreSQL**
3. Đợi vài giây để tạo xong

### Bước 5: Kết nối Server với Database

1. Click vào **Service** (backend)
2. Vào tab **Variables**
3. Railway tự động thêm `DATABASE_URL` từ PostgreSQL
4. Nếu chưa có, click **Add Variable**:
   - Key: `DATABASE_URL`
   - Value: Click **Add Reference** → Chọn PostgreSQL → `DATABASE_URL`

### Bước 6: Deploy và Test

1. Railway sẽ tự động redeploy
2. Vào tab **Settings** → Copy **Public Domain**
3. Truy cập domain để test admin dashboard

---

## 🔐 Thông tin đăng nhập Admin (Development)

- **Username:** `admin`
- **Password:** `htic@2026`

> ⚠️ **QUAN TRỌNG:** Trong production, phải đặt `ADMIN_PASS_HASH` environment variable với bcrypt hash của password thực!

---

## 📡 API Endpoints

### Public APIs (cho App)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/events` | Lấy danh sách nghĩa vụ |
| GET | `/api/news` | Lấy danh sách tin tức |
| GET | `/api/agencies` | Lấy danh sách cơ quan |
| GET | `/api/provinces` | Lấy danh sách tỉnh/TP |
| GET | `/api/settings` | Lấy cài đặt app |

### Admin APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/admin/login` | Đăng nhập admin |
| GET | `/api/admin/events` | Lấy danh sách nghĩa vụ |
| POST | `/api/admin/events` | Tạo nghĩa vụ mới |
| PUT | `/api/admin/events/:id` | Cập nhật nghĩa vụ |
| DELETE | `/api/admin/events/:id` | Xóa nghĩa vụ |
| GET | `/api/admin/news` | Lấy danh sách tin tức |
| POST | `/api/admin/news` | Tạo tin tức mới |
| PUT | `/api/admin/news/:id` | Cập nhật tin tức |
| DELETE | `/api/admin/news/:id` | Xóa tin tức |
| GET | `/api/admin/agencies` | Lấy danh sách cơ quan |
| POST | `/api/admin/agencies` | Tạo cơ quan mới |
| PUT | `/api/admin/agencies/:id` | Cập nhật cơ quan |
| DELETE | `/api/admin/agencies/:id` | Xóa cơ quan |
| GET | `/api/admin/provinces` | Lấy danh sách tỉnh/TP |
| POST | `/api/admin/provinces` | Tạo tỉnh/TP mới |
| PUT | `/api/admin/provinces/:id` | Cập nhật tỉnh/TP |
| DELETE | `/api/admin/provinces/:id` | Xóa tỉnh/TP |
| GET | `/api/admin/stats` | Thống kê |

---

## 📱 Cập nhật App Flutter

Sau khi deploy xong, cập nhật URL trong app Flutter:

**File:** `lib/services/data_service.dart`

```dart
// Thay đổi URL này thành domain Railway của bạn
static const String baseUrl = 'https://YOUR-APP.up.railway.app';
```

---

## 💰 Chi phí

Railway tính theo usage:
- **Server:** ~$3-5/tháng
- **PostgreSQL:** ~$2-5/tháng
- **Tổng:** ~$5-10/tháng (~125K-250K VND)

---

## ❓ Troubleshooting

### Lỗi "Cannot connect to database"
- Kiểm tra biến `DATABASE_URL` đã được set chưa
- Đảm bảo PostgreSQL đang chạy (trạng thái xanh)

### Lỗi "502 Bad Gateway"
- Kiểm tra logs trong Railway
- Đảm bảo `PORT` không bị hardcode

### Admin không đăng nhập được
- Mật khẩu mặc định: `htic2025`
- Kiểm tra database đã được khởi tạo chưa

---

## 📞 Hỗ trợ

- Email: contact@htic.com.vn
- Phone: 0918 682 879

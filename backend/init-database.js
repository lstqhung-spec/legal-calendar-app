const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// Tao thu muc data neu chua co
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// ============ ADMINS ============
const admins = [
    {
        id: 1,
        username: 'admin',
        password: 'htic2025',
        fullName: 'Administrator',
        email: 'admin@htic.com.vn',
        role: 'super_admin',
        createdAt: new Date().toISOString()
    }
];

// ============ PROVINCES ============
const provinces = [
    { id: 'hcm', name: 'TP. Ho Chi Minh', region: 'south' },
    { id: 'hn', name: 'Ha Noi', region: 'north' },
    { id: 'dn', name: 'Da Nang', region: 'central' },
    { id: 'hp', name: 'Hai Phong', region: 'north' },
    { id: 'ct', name: 'Can Tho', region: 'south' },
    { id: 'bd', name: 'Binh Duong', region: 'south' },
    { id: 'dn2', name: 'Dong Nai', region: 'south' },
    { id: 'la', name: 'Long An', region: 'south' }
];

// ============ AGENCY CATEGORIES ============
const agencyCategories = [
    { id: 'tax', name: 'Co quan Thue', color: 'red' },
    { id: 'court', name: 'Toa an', color: 'purple' },
    { id: 'enforcement', name: 'Thi hanh an', color: 'orange' },
    { id: 'police', name: 'Cong an', color: 'blue' },
    { id: 'insurance', name: 'BHXH', color: 'green' },
    { id: 'labor', name: 'So LDTBXH', color: 'teal' },
    { id: 'business', name: 'Dang ky KD', color: 'indigo' }
];

// ============ AGENCIES ============
const agencies = [
    // TP. Ho Chi Minh
    { id: 1, provinceId: 'hcm', category: 'tax', name: 'Cuc Thue TP. Ho Chi Minh', address: '63 Hai Ba Trung, Phuong Ben Nghe, Quan 1', phone: '028 3829 7171', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: 'hcmtax.gov.vn', isActive: true },
    { id: 2, provinceId: 'hcm', category: 'tax', name: 'Chi cuc Thue Quan 1', address: '59-61 Ly Tu Trong, Phuong Ben Nghe, Quan 1', phone: '028 3824 1640', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 3, provinceId: 'hcm', category: 'court', name: 'Toa an Nhan dan TP. HCM', address: '131 Nam Ky Khoi Nghia, Quan 1', phone: '028 3829 7949', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 4, provinceId: 'hcm', category: 'court', name: 'Toa an Nhan dan Quan 1', address: '99 Nguyen Dinh Chieu, Quan 3', phone: '028 3930 5963', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 5, provinceId: 'hcm', category: 'enforcement', name: 'Cuc Thi hanh an Dan su TP. HCM', address: '141-143 Pasteur, Quan 3', phone: '028 3823 0940', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 6, provinceId: 'hcm', category: 'police', name: 'Cong an TP. Ho Chi Minh', address: '268 Tran Hung Dao, Quan 1', phone: '028 3839 8282', hours: '24/7', website: '', isActive: true },
    { id: 7, provinceId: 'hcm', category: 'police', name: 'Cong an Quan 1', address: '17 Tran Cao Van, Quan 3', phone: '028 3829 3829', hours: '24/7', website: '', isActive: true },
    { id: 8, provinceId: 'hcm', category: 'insurance', name: 'BHXH TP. Ho Chi Minh', address: '35 Le Quy Don, Quan 3', phone: '028 3930 2424', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 9, provinceId: 'hcm', category: 'labor', name: 'So Lao dong - TB&XH TP. HCM', address: '159 Pasteur, Quan 3', phone: '028 3829 6413', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 10, provinceId: 'hcm', category: 'business', name: 'So Ke hoach va Dau tu TP. HCM', address: '32 Le Thanh Ton, Quan 1', phone: '028 3823 1520', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    
    // Ha Noi
    { id: 11, provinceId: 'hn', category: 'tax', name: 'Cuc Thue TP. Ha Noi', address: '20 Ly Thuong Kiet, Hoan Kiem', phone: '024 3826 3538', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: 'hanoi.gdt.gov.vn', isActive: true },
    { id: 12, provinceId: 'hn', category: 'court', name: 'Toa an Nhan dan TP. Ha Noi', address: '43 Hai Ba Trung, Hoan Kiem', phone: '024 3825 7203', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 13, provinceId: 'hn', category: 'enforcement', name: 'Cuc Thi hanh an Dan su TP. Ha Noi', address: '1 Ngo Thi Nham, Hoan Kiem', phone: '024 3934 8061', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 14, provinceId: 'hn', category: 'police', name: 'Cong an TP. Ha Noi', address: '87 Tran Hung Dao, Hoan Kiem', phone: '024 3942 4244', hours: '24/7', website: '', isActive: true },
    { id: 15, provinceId: 'hn', category: 'insurance', name: 'BHXH TP. Ha Noi', address: '15 Le Dai Hanh, Hai Ba Trung', phone: '024 3978 8988', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 16, provinceId: 'hn', category: 'labor', name: 'So Lao dong - TB&XH Ha Noi', address: '75 Nguyen Chi Thanh, Dong Da', phone: '024 3835 1717', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 17, provinceId: 'hn', category: 'business', name: 'So Ke hoach va Dau tu Ha Noi', address: '16 Cat Linh, Dong Da', phone: '024 3823 5606', hours: '8:00 - 17:00 (Thu 2 - Thu 6)', website: '', isActive: true },
    
    // Da Nang
    { id: 18, provinceId: 'dn', category: 'tax', name: 'Cuc Thue TP. Da Nang', address: '77 Tran Phu, Hai Chau', phone: '0236 3822 173', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 19, provinceId: 'dn', category: 'court', name: 'Toa an Nhan dan TP. Da Nang', address: '374 Dien Bien Phu, Thanh Khe', phone: '0236 3847 145', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 20, provinceId: 'dn', category: 'police', name: 'Cong an TP. Da Nang', address: '47 Ly Tu Trong, Hai Chau', phone: '0236 3821 222', hours: '24/7', website: '', isActive: true },
    { id: 21, provinceId: 'dn', category: 'insurance', name: 'BHXH TP. Da Nang', address: '62 Tran Quoc Toan, Hai Chau', phone: '0236 3818 282', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    
    // Hai Phong
    { id: 22, provinceId: 'hp', category: 'tax', name: 'Cuc Thue TP. Hai Phong', address: '12 Ly Tu Trong, Hong Bang', phone: '0225 3745 281', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 23, provinceId: 'hp', category: 'court', name: 'Toa an Nhan dan TP. Hai Phong', address: '1 Tran Phu, Ngo Quyen', phone: '0225 3823 546', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 24, provinceId: 'hp', category: 'police', name: 'Cong an TP. Hai Phong', address: '2 Le Dai Hanh, Hong Bang', phone: '0225 3747 244', hours: '24/7', website: '', isActive: true },
    
    // Can Tho
    { id: 25, provinceId: 'ct', category: 'tax', name: 'Cuc Thue TP. Can Tho', address: '2 Hoa Binh, Ninh Kieu', phone: '0292 3820 777', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 26, provinceId: 'ct', category: 'court', name: 'Toa an Nhan dan TP. Can Tho', address: '151 Tran Hung Dao, Ninh Kieu', phone: '0292 3823 535', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 27, provinceId: 'ct', category: 'police', name: 'Cong an TP. Can Tho', address: '8 Hung Vuong, Ninh Kieu', phone: '0292 3820 999', hours: '24/7', website: '', isActive: true },
    
    // Binh Duong
    { id: 28, provinceId: 'bd', category: 'tax', name: 'Cuc Thue tinh Binh Duong', address: 'Dai lo Binh Duong, Thu Dau Mot', phone: '0274 3822 168', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 29, provinceId: 'bd', category: 'court', name: 'Toa an Nhan dan tinh Binh Duong', address: 'Duong 30/4, Thu Dau Mot', phone: '0274 3824 456', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 30, provinceId: 'bd', category: 'police', name: 'Cong an tinh Binh Duong', address: 'Dai lo Binh Duong, Thu Dau Mot', phone: '0274 3822 113', hours: '24/7', website: '', isActive: true },
    
    // Dong Nai
    { id: 31, provinceId: 'dn2', category: 'tax', name: 'Cuc Thue tinh Dong Nai', address: '46 Cach Mang Thang 8, Bien Hoa', phone: '0251 3822 262', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 32, provinceId: 'dn2', category: 'court', name: 'Toa an Nhan dan tinh Dong Nai', address: '1A Nguyen Ai Quoc, Bien Hoa', phone: '0251 3822 118', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 33, provinceId: 'dn2', category: 'police', name: 'Cong an tinh Dong Nai', address: '161 Nguyen Ai Quoc, Bien Hoa', phone: '0251 3822 113', hours: '24/7', website: '', isActive: true },
    
    // Long An
    { id: 34, provinceId: 'la', category: 'tax', name: 'Cuc Thue tinh Long An', address: '118 Hung Vuong, TP. Tan An', phone: '0272 3826 282', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 35, provinceId: 'la', category: 'court', name: 'Toa an Nhan dan tinh Long An', address: '66 Truong Dinh, TP. Tan An', phone: '0272 3826 118', hours: '7:30 - 16:30 (Thu 2 - Thu 6)', website: '', isActive: true },
    { id: 36, provinceId: 'la', category: 'police', name: 'Cong an tinh Long An', address: '111 Hung Vuong, TP. Tan An', phone: '0272 3826 113', hours: '24/7', website: '', isActive: true }
];

// ============ EVENT CATEGORIES ============
const eventCategories = [
    { id: 'tax', name: 'Thue', color: 'red' },
    { id: 'insurance', name: 'BHXH', color: 'blue' },
    { id: 'report', name: 'Bao cao', color: 'green' },
    { id: 'license', name: 'Giay phep', color: 'orange' }
];

// ============ EVENTS (Lich phap ly mau) ============
const events = [
    {
        id: 1,
        title: 'Nop to khai thue GTGT thang',
        category: 'tax',
        dayOfMonth: 20,
        frequency: 'monthly',
        description: 'Nop to khai thue Gia tri gia tang hang thang cho co quan thue. Ap dung cho doanh nghiep ke khai thue GTGT theo phuong phap khau tru.',
        legalReference: 'Luat Quan ly thue 2019, Dieu 44; Nghi dinh 126/2020/ND-CP',
        penalty: 'Phat tu 2.000.000 - 25.000.000 dong tuy theo so ngay cham nop',
        instructions: '1. Dang nhap he thong eTax (thuedientu.gdt.gov.vn)\n2. Chon "Ke khai truc tuyen"\n3. Chon mau to khai 01/GTGT\n4. Dien thong tin va nop to khai\n5. Luu lai ma giao dich',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Dong BHXH, BHYT, BHTN',
        category: 'insurance',
        dayOfMonth: 25,
        frequency: 'monthly',
        description: 'Dong bao hiem xa hoi, bao hiem y te, bao hiem that nghiep hang thang cho nguoi lao dong.',
        legalReference: 'Luat BHXH 2014, Dieu 85-86; Luat BHYT 2008',
        penalty: 'Phat tu 12% - 15% so tien cham dong. Ngoai ra con phai dong tien lai cham nop.',
        instructions: '1. Dang nhap BHXH dien tu\n2. Lap bang ke ho so\n3. Kiem tra danh sach lao dong\n4. Nop tien qua ngan hang lien ket',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        title: 'Nop to khai thue TNCN',
        category: 'tax',
        dayOfMonth: 20,
        frequency: 'monthly',
        description: 'Nop to khai thue Thu nhap ca nhan khau tru tai nguon cho nguoi lao dong trong doanh nghiep.',
        legalReference: 'Nghi dinh 126/2020/ND-CP; Thong tu 80/2021/TT-BTC',
        penalty: 'Phat tu 2.000.000 - 25.000.000 dong',
        instructions: '1. Tong hop thu nhap NLD trong thang\n2. Tinh thue TNCN phai nop\n3. Ke khai mau 05/KK-TNCN\n4. Nop qua he thong eTax',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 4,
        title: 'Bao cao tinh hinh su dung hoa don',
        category: 'report',
        dayOfMonth: 30,
        frequency: 'quarterly',
        description: 'Bao cao tinh hinh su dung hoa don dien tu trong quy. Ap dung cho tat ca doanh nghiep su dung hoa don.',
        legalReference: 'Thong tu 78/2021/TT-BTC; Nghi dinh 123/2020/ND-CP',
        penalty: 'Phat tu 4.000.000 - 8.000.000 dong',
        instructions: '1. Kiem tra hoa don da su dung trong quy\n2. Lap bao cao mau BC26/HD\n3. Nop qua he thong eTax',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 5,
        title: 'Nop to khai thue GTGT quy',
        category: 'tax',
        dayOfMonth: 30,
        frequency: 'quarterly',
        description: 'Nop to khai thue GTGT theo quy (ap dung cho DN co doanh thu duoi 50 ty/nam va dang ky ke khai theo quy).',
        legalReference: 'Luat Quan ly thue 2019; Thong tu 80/2021/TT-BTC',
        penalty: 'Phat tu 2.000.000 - 25.000.000 dong',
        instructions: '1. Tong hop hoa don dau vao/dau ra trong quy\n2. Ke khai mau 01/GTGT\n3. Nop qua he thong eTax',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 6,
        title: 'Bao cao nam ve Lao dong',
        category: 'report',
        dayOfMonth: 5,
        frequency: 'yearly',
        month: 1,
        description: 'Bao cao tinh hinh su dung lao dong nam truoc gui So Lao dong - Thuong binh va Xa hoi.',
        legalReference: 'Bo luat Lao dong 2019, Dieu 12',
        penalty: 'Phat tu 5.000.000 - 10.000.000 dong',
        instructions: '1. Tong hop so lieu lao dong trong nam\n2. Lap bao cao theo mau\n3. Nop So LDTBXH dia phuong',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 7,
        title: 'Nop bao cao tai chinh nam',
        category: 'report',
        dayOfMonth: 30,
        frequency: 'yearly',
        month: 3,
        description: 'Nop bao cao tai chinh nam cho co quan thue. Han chot 90 ngay ke tu ngay ket thuc nam tai chinh.',
        legalReference: 'Luat Ke toan 2015; Thong tu 200/2014/TT-BTC',
        penalty: 'Phat tu 5.000.000 - 10.000.000 dong',
        instructions: '1. Hoan thanh so sach ke toan\n2. Lap bao cao tai chinh\n3. Nop qua he thong eTax',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 8,
        title: 'Quyet toan thue TNDN nam',
        category: 'tax',
        dayOfMonth: 30,
        frequency: 'yearly',
        month: 3,
        description: 'Quyet toan thue Thu nhap doanh nghiep nam. Han chot 90 ngay ke tu ngay ket thuc nam tai chinh.',
        legalReference: 'Luat Thue TNDN; Thong tu 78/2014/TT-BTC',
        penalty: 'Phat tu 2.000.000 - 25.000.000 dong',
        instructions: '1. Tong hop doanh thu, chi phi ca nam\n2. Tinh thue TNDN phai nop\n3. Lap to khai quyet toan 03/TNDN\n4. Nop qua eTax',
        isActive: true,
        createdAt: new Date().toISOString()
    }
];

// ============ NEWS ============
const news = [
    {
        id: 1,
        title: 'Tang muc luong toi thieu vung tu 01/07/2025',
        category: 'Lao dong',
        summary: 'Chinh phu ban hanh Nghi dinh moi ve muc luong toi thieu vung, tang binh quan 6% so voi nam truoc. Doanh nghiep can dieu chinh bang luong.',
        content: 'Noi dung chi tiet ve viec tang luong toi thieu vung...',
        date: '2025-01-15',
        isHot: true,
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Huong dan moi ve hoa don dien tu tu 2025',
        category: 'Thue',
        summary: 'Thong tu 78/2024/TT-BTC huong dan chi tiet ve hoa don dien tu khoi tao tu may tinh tien. Co hieu luc tu 01/01/2025.',
        content: 'Noi dung chi tiet ve hoa don dien tu...',
        date: '2025-01-12',
        isHot: true,
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        title: 'Sua doi Luat Doanh nghiep: Diem moi can biet',
        category: 'Doanh nghiep',
        summary: 'Luat Doanh nghiep sua doi 2024 co hieu luc voi nhieu thay doi quan trong ve dang ky kinh doanh va quan tri cong ty.',
        content: 'Noi dung chi tiet ve Luat Doanh nghiep sua doi...',
        date: '2025-01-10',
        isHot: false,
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 4,
        title: 'Chinh sach BHXH moi tu nam 2025',
        category: 'BHXH',
        summary: 'Tong hop cac thay doi ve chinh sach BHXH, BHYT, BHTN co hieu luc tu nam 2025. Dieu chinh muc dong va quyen loi.',
        content: 'Noi dung chi tiet ve chinh sach BHXH...',
        date: '2025-01-08',
        isHot: false,
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 5,
        title: 'Quy dinh moi ve thue thu nhap doanh nghiep',
        category: 'Thue',
        summary: 'Nghi dinh moi ve thue TNDN voi nhieu uu dai cho doanh nghiep nho va vua, startup cong nghe.',
        content: 'Noi dung chi tiet ve thue TNDN...',
        date: '2025-01-05',
        isHot: false,
        isActive: true,
        createdAt: new Date().toISOString()
    }
];

// ============ BUSINESSES ============
const businesses = [
    {
        id: 1,
        name: 'Cong ty TNHH ABC',
        field: 'San xuat',
        intro: 'Chuyen san xuat linh kien dien tu, tim nha phan phoi toan quoc',
        lookingFor: 'Tim nha phan phoi',
        employees: 50,
        location: 'TP.HCM',
        phone: '028 1234 5678',
        email: 'contact@abc.com.vn',
        verified: true,
        isActive: true,
        userId: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        name: 'Cong ty CP XYZ',
        field: 'Thuong mai',
        intro: 'Nhap khau hang tieu dung tu Nhat Ban, Han Quoc',
        lookingFor: 'Tim nha cung cap',
        employees: 30,
        location: 'Ha Noi',
        phone: '024 9876 5432',
        email: 'info@xyz.com.vn',
        verified: true,
        isActive: true,
        userId: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        name: 'Tech Solutions',
        field: 'Cong nghe',
        intro: 'Phat trien phan mem quan ly doanh nghiep',
        lookingFor: 'Tim doi tac',
        employees: 20,
        location: 'Da Nang',
        phone: '0236 1111 2222',
        email: 'hello@techsolutions.vn',
        verified: false,
        isActive: true,
        userId: null,
        createdAt: new Date().toISOString()
    }
];

// ============ USERS ============
const users = [];

// ============ SAVE ALL DATA ============
const saveData = (filename, data) => {
    const filepath = path.join(dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Da tao: ${filename}`);
};

saveData('admins.json', admins);
saveData('provinces.json', provinces);
saveData('agency-categories.json', agencyCategories);
saveData('agencies.json', agencies);
saveData('event-categories.json', eventCategories);
saveData('events.json', events);
saveData('news.json', news);
saveData('businesses.json', businesses);
saveData('users.json', users);

console.log('\n========================================');
console.log('KHOI TAO DATABASE THANH CONG!');
console.log('========================================');
console.log('Admin dang nhap:');
console.log('  Username: admin');
console.log('  Password: htic2025');
console.log('========================================\n');

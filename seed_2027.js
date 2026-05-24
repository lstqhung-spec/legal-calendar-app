// ═══════════════════════════════════════════════════════════════════════════
// SEED: Lịch năm 2027 (01/01–31/12/2027)
// ───────────────────────────────────────────────────────────────────────────
// Idempotent: NOT EXISTS guard theo (title, deadline). An toàn redeploy.
// Mọi step viết theo căn cứ pháp luật đã ghi tại legal_basis của event tương
// ứng. Mục CHƯA chắc chắn KHÔNG ghi tại đây — xem README block cuối file
// "CẦN XÁC MINH".
// ═══════════════════════════════════════════════════════════════════════════

// ── Bộ step dùng chung cho các nghĩa vụ định kỳ ────────────────────────────
const STEPS_GTGT_MONTHLY = [
  'Đối chiếu hóa đơn điện tử đầu vào, đầu ra trên Cổng hóa đơn điện tử của Tổng cục Thuế',
  'Lập tờ khai Mẫu 01/GTGT trên phần mềm HTKK (hoặc eTax)',
  'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
  'Nộp số thuế GTGT phát sinh (nếu có) qua Cổng thanh toán điện tử của Tổng cục Thuế',
  'Lưu tờ khai và giấy nộp tiền vào hồ sơ kế toán'
];

const STEPS_TNCN_MONTHLY = [
  'Tổng hợp dữ liệu chi trả thu nhập và thuế TNCN đã khấu trừ tại nguồn trong tháng',
  'Lập tờ khai Mẫu 05/KK-TNCN trên phần mềm HTKK (hoặc eTax)',
  'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
  'Nộp số thuế TNCN phát sinh (nếu có) qua Cổng thanh toán điện tử',
  'Lưu chứng từ khấu trừ thuế cấp cho từng cá nhân theo yêu cầu'
];

const STEPS_GTGT_QUARTERLY = [
  'Đối chiếu hóa đơn điện tử đầu vào, đầu ra trên Cổng hóa đơn điện tử cho cả quý',
  'Lập tờ khai Mẫu 01/GTGT trên phần mềm HTKK (hoặc eTax)',
  'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
  'Nộp số thuế GTGT phát sinh (nếu có) qua Cổng thanh toán điện tử',
  'Lưu tờ khai và chứng từ vào hồ sơ kế toán'
];

const STEPS_TNCN_QUARTERLY = [
  'Tổng hợp dữ liệu chi trả thu nhập và thuế TNCN đã khấu trừ trong cả quý',
  'Lập tờ khai Mẫu 05/KK-TNCN trên phần mềm HTKK (hoặc eTax)',
  'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn',
  'Nộp số thuế TNCN phát sinh (nếu có) qua Cổng thanh toán điện tử',
  'Lưu chứng từ khấu trừ cho từng cá nhân'
];

const STEPS_TNDN_PROVISIONAL = [
  'Ước tính lợi nhuận trước thuế của quý dựa trên sổ kế toán',
  'Xác định số thuế TNDN tạm nộp theo thuế suất hiện hành',
  'Lập giấy nộp tiền (mã chương, tiểu mục TNDN) trên Cổng thanh toán điện tử của Tổng cục Thuế',
  'Hạch toán bút toán tạm nộp vào sổ kế toán',
  'Lưu ý: tổng số tạm nộp 4 quý phải ≥ 80% nghĩa vụ TNDN cả năm để tránh tiền chậm nộp 0,03%/ngày (Điều 8 NĐ 126/2020 sửa đổi NĐ 91/2022)'
];

const STEPS_BHXH_MONTHLY = [
  'Tính số phải nộp BHXH, BHYT, BHTN, BHTNLĐ-BNN trên quỹ tiền lương đóng BHXH của tháng',
  'Lập hồ sơ và đóng qua phần mềm giao dịch điện tử BHXH (iBHXH/eBH/iVAN/VssID-DN)',
  'Chuyển tiền vào tài khoản chuyên thu của cơ quan BHXH trước hạn cuối tháng',
  'Đối chiếu Thông báo kết quả đóng BHXH, BHYT, BHTN (Mẫu C12-TS) trên Cổng BHXH',
  'Xử lý chênh lệch (nếu có) trong kỳ tiếp theo'
];

const STEPS_KPCD_MONTHLY = [
  'Tính 2% trên quỹ tiền lương làm căn cứ đóng BHXH của tháng',
  'Chuyển khoản tới tài khoản công đoàn cấp trên trực tiếp (LĐLĐ cấp huyện/tỉnh) theo hướng dẫn',
  'Lưu chứng từ chuyển tiền cùng bảng tính quỹ lương',
  'Áp dụng theo Luật Công đoàn 50/2024/QH15 và Nghị định hướng dẫn'
];

const STEPS_BIENDONG_LAODONG = [
  'Tổng hợp danh sách lao động tăng/giảm phát sinh trong tháng',
  'Lập thông báo theo mẫu hiện hành (Mẫu số 29 TT 28/2015/TT-BLĐTBXH hoặc mẫu mới theo NĐ 352/2025/NĐ-CP)',
  'Nộp thông báo cho Trung tâm Dịch vụ việc làm nơi đặt trụ sở (qua Cổng DVC hoặc trực tiếp) trước ngày 03 tháng kế tiếp',
  'Lưu biên nhận, đối chiếu với hồ sơ BHXH',
  'Nếu giảm từ 50 lao động trở lên trong tháng: thông báo ngay trong vòng 03 ngày làm việc'
];

const STEPS_PHIBVMT_NUOCTHAI = [
  'Tổng hợp khối lượng nước thải, kết quả quan trắc chất gây ô nhiễm (COD, TSS, Hg, Pb, As, Cd, Cr…) trong quý',
  'Tính phí cố định (4tr/năm chia 4 quý cho cơ sở có lưu lượng dưới ngưỡng) và phí biến đổi (theo từng chất ô nhiễm)',
  'Lập Tờ khai phí BVMT theo Mẫu của Nghị định 53/2020/NĐ-CP và nộp tại cơ quan thuế quản lý trực tiếp',
  'Nộp phí qua Cổng thanh toán điện tử của Tổng cục Thuế trước hạn',
  'Lưu hồ sơ kê khai, chứng từ nộp phí và kết quả quan trắc'
];

const STEPS_HOLIDAY = [
  'Thông báo lịch nghỉ lễ cho người lao động trước kỳ nghỉ',
  'Bố trí trực bảo vệ, đảm bảo an toàn tài sản và PCCC trong thời gian nghỉ',
  'Trả lương 300% nếu bố trí làm thêm ngày lễ theo Bộ luật Lao động',
  'Lên kế hoạch khôi phục hoạt động ngay sau kỳ nghỉ'
];

const LEGAL_GTGT_TNCN = 'Điểm a khoản 1 Điều 44 Luật Quản lý thuế số 38/2019/QH14 (áp dụng đến 30/6/2026); từ 01/7/2026 áp dụng Luật QLT 108/2025/QH15.';
const LEGAL_TNDN_PROV = 'Điểm b khoản 6 Điều 8 Nghị định 126/2020/NĐ-CP sửa đổi bởi Nghị định 91/2022/NĐ-CP.';
const LEGAL_BHXH = 'Luật Bảo hiểm xã hội số 41/2024/QH15 (hiệu lực 01/7/2025); Quyết định 595/QĐ-BHXH và văn bản thay thế.';
const LEGAL_KPCD = 'Luật Công đoàn 50/2024/QH15; Nghị định hướng dẫn hiện hành.';
const LEGAL_BIENDONG = 'Điều 16 Thông tư 28/2015/TT-BLĐTBXH (Mẫu 29); Luật Việc làm 74/2025/QH15 và Nghị định 352/2025/NĐ-CP (mẫu mới khi có).';
const LEGAL_PHIBVMT = 'Nghị định 53/2020/NĐ-CP về phí BVMT đối với nước thải (sửa đổi NĐ 90/2023/NĐ-CP nếu có); hạn kê khai và nộp phí: chậm nhất ngày 30 của tháng đầu quý sau.';

const PEN_TAX = 'Tổ chức (cá nhân bằng 1/2): chậm 1-30 ngày 2-5 triệu; 31-60 ngày 5-8 triệu (Nghị định 125/2020 sửa đổi 310/2025). Tiền chậm nộp 0,03%/ngày. Xem chi tiết tại văn bản được trích dẫn.';
const PEN_BHXH = 'Chậm đóng: phạt 12%-15% tổng số phải đóng (khoản 5 Điều 39 Nghị định 12/2022/NĐ-CP) + 0,03%/ngày (Điều 40, 41 Luật BHXH 41/2024). Xem chi tiết tại văn bản được trích dẫn.';
const PEN_KPCD = 'Chậm đóng/không đóng KPCĐ bị xử phạt theo Nghị định 12/2022/NĐ-CP (Điều 38). Xem chi tiết tại văn bản được trích dẫn.';
const PEN_BIENDONG = 'Không thông báo bị xử phạt theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.';
const PEN_PHIBVMT = 'Chậm nộp phí: tính tiền chậm nộp; kê khai không đúng có thể bị truy thu và xử phạt hành chính theo Nghị định 45/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.';
const PEN_HOLIDAY = 'Phạt từ 20-40 triệu đồng nếu không cho người lao động nghỉ lễ (Điều 17 NĐ 12/2022/NĐ-CP).';

// ═══════════════════════════════════════════════════════════════════════════
// HOLIDAYS 2027 (Điều 112 BLLĐ 2019)
// ═══════════════════════════════════════════════════════════════════════════
const HOLIDAYS_2027 = [
  {
    title: '🎆 Nghỉ Tết Dương lịch 2027',
    deadline: '2027-01-01',
    category: 'holiday',
    description: 'Ngày nghỉ lễ bắt buộc: Tết Dương lịch 01/01/2027 (Thứ Sáu). Người lao động được nghỉ 01 ngày hưởng nguyên lương.',
    legal_basis: 'Điểm a Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY,
    notes: 'Nếu trùng ngày nghỉ hằng tuần thì được nghỉ bù ngày làm việc kế tiếp (Khoản 3 Điều 112 BLLĐ)'
  },
  {
    title: '🧧 Nghỉ Tết Nguyên Đán Đinh Mùi — 30 tháng Chạp (Ngày 1/5)',
    deadline: '2027-02-05',
    category: 'holiday',
    description: 'Ngày 30 tháng Chạp Bính Ngọ — ngày đầu của kỳ nghỉ Tết Nguyên đán 2027 theo phương án 5 ngày liền kề (mùng 1 Tết = Thứ Bảy 06/02/2027). Lịch chính thức + nghỉ bù sẽ do Thủ tướng quyết định cuối năm 2026.',
    legal_basis: 'Điểm b Khoản 1 Điều 112 Bộ luật Lao động 2019 — Tết Âm lịch 05 ngày',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🧧 Nghỉ Tết Nguyên Đán Đinh Mùi — Mùng 1 Tết (Ngày 2/5)',
    deadline: '2027-02-06',
    category: 'holiday',
    description: 'Mùng 1 Tết Đinh Mùi — Thứ Bảy 06/02/2027 (trùng nghỉ hằng tuần — sẽ có nghỉ bù theo Khoản 3 Điều 112 BLLĐ).',
    legal_basis: 'Điểm b Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🧧 Nghỉ Tết Nguyên Đán Đinh Mùi — Mùng 2 Tết (Ngày 3/5)',
    deadline: '2027-02-07',
    category: 'holiday',
    description: 'Mùng 2 Tết Đinh Mùi — Chủ Nhật 07/02/2027 (trùng nghỉ hằng tuần — sẽ có nghỉ bù theo Khoản 3 Điều 112 BLLĐ).',
    legal_basis: 'Điểm b Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🧧 Nghỉ Tết Nguyên Đán Đinh Mùi — Mùng 3 Tết (Ngày 4/5)',
    deadline: '2027-02-08',
    category: 'holiday',
    description: 'Mùng 3 Tết Đinh Mùi — Thứ Hai 08/02/2027.',
    legal_basis: 'Điểm b Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🧧 Nghỉ Tết Nguyên Đán Đinh Mùi — Mùng 4 Tết (Ngày 5/5)',
    deadline: '2027-02-09',
    category: 'holiday',
    description: 'Mùng 4 Tết Đinh Mùi — Thứ Ba 09/02/2027.',
    legal_basis: 'Điểm b Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🏯 Nghỉ Giỗ Tổ Hùng Vương (10/3 âm lịch)',
    deadline: '2027-04-16',
    category: 'holiday',
    description: 'Giỗ Tổ Hùng Vương — 10/3 âm lịch năm Đinh Mùi rơi vào Thứ Sáu 16/04/2027. Người lao động được nghỉ 01 ngày hưởng nguyên lương.',
    legal_basis: 'Điểm e Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🚩 Nghỉ lễ Ngày Giải phóng miền Nam 30/4',
    deadline: '2027-04-30',
    category: 'holiday',
    description: '30/4/2027 — Thứ Sáu. Người lao động được nghỉ 01 ngày hưởng nguyên lương.',
    legal_basis: 'Điểm c Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '👷 Nghỉ lễ Ngày Quốc tế Lao động 1/5',
    deadline: '2027-05-01',
    category: 'holiday',
    description: '1/5/2027 — Thứ Bảy (trùng nghỉ hằng tuần — được nghỉ bù vào Thứ Hai 03/05/2027 theo Khoản 3 Điều 112 BLLĐ).',
    legal_basis: 'Điểm d Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  },
  {
    title: '🇻🇳 Nghỉ lễ Quốc khánh 2/9 (Ngày 1/2)',
    deadline: '2027-09-02',
    category: 'holiday',
    description: '2/9/2027 — Thứ Năm. Người lao động được nghỉ 02 ngày Quốc khánh hưởng nguyên lương (gồm 2/9 và 01 ngày liền kề trước hoặc sau theo quyết định của Thủ tướng).',
    legal_basis: 'Điểm đ Khoản 1 Điều 112 Bộ luật Lao động 2019',
    penalty: PEN_HOLIDAY
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// GENERAL RECURRING 2027 (Free/general — cho mọi DN)
// ═══════════════════════════════════════════════════════════════════════════

// Helper xây nhanh entries định kỳ tháng
function buildMonthly(template, kyList) {
  return kyList.map(({ ky, deadline }) => ({
    title: template.titleFn(ky),
    deadline,
    category: template.category,
    scope: 'general',
    industry: null,
    frequency: template.frequency,
    priority: template.priority,
    description: template.descFn(ky),
    legal_basis: template.legal,
    penalty: template.penalty,
    steps: template.steps
  }));
}

const GENERAL_RECURRING_2027 = [];

// ── 1. Khai thuế GTGT theo tháng (kỳ tháng X/2027 hạn 20 tháng X+1; điều chỉnh weekend) ──
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Khai thuế GTGT kỳ tháng ${ky}`,
  descFn: ky => `Tổ chức nộp hồ sơ khai thuế GTGT theo tháng cho kỳ ${ky}.`,
  category: 'tax', frequency: 'monthly', priority: 'high',
  legal: LEGAL_GTGT_TNCN, penalty: PEN_TAX, steps: STEPS_GTGT_MONTHLY
}, [
  { ky: '12/2026', deadline: '2027-01-20' },
  { ky: '1/2027',  deadline: '2027-02-22' },  // 20/2 Sat → 22 Mon
  { ky: '2/2027',  deadline: '2027-03-22' },  // 20/3 Sat → 22 Mon
  { ky: '3/2027',  deadline: '2027-04-20' },
  { ky: '4/2027',  deadline: '2027-05-20' },
  { ky: '5/2027',  deadline: '2027-06-21' },  // 20/6 Sun → 21 Mon
  { ky: '6/2027',  deadline: '2027-07-20' },
  { ky: '7/2027',  deadline: '2027-08-20' },
  { ky: '8/2027',  deadline: '2027-09-20' },
  { ky: '9/2027',  deadline: '2027-10-20' },
  { ky: '10/2027', deadline: '2027-11-22' },  // 20/11 Sat → 22 Mon
  { ky: '11/2027', deadline: '2027-12-20' }
]));

// ── 2. Khai thuế TNCN khấu trừ theo tháng ─────────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Khai thuế TNCN khấu trừ kỳ tháng ${ky}`,
  descFn: ky => `Tổ chức trả thu nhập khai và nộp thuế TNCN khấu trừ theo tháng cho kỳ ${ky}.`,
  category: 'tax', frequency: 'monthly', priority: 'high',
  legal: LEGAL_GTGT_TNCN, penalty: PEN_TAX, steps: STEPS_TNCN_MONTHLY
}, [
  { ky: '12/2026', deadline: '2027-01-20' },
  { ky: '1/2027',  deadline: '2027-02-22' },
  { ky: '2/2027',  deadline: '2027-03-22' },
  { ky: '3/2027',  deadline: '2027-04-20' },
  { ky: '4/2027',  deadline: '2027-05-20' },
  { ky: '5/2027',  deadline: '2027-06-21' },
  { ky: '6/2027',  deadline: '2027-07-20' },
  { ky: '7/2027',  deadline: '2027-08-20' },
  { ky: '8/2027',  deadline: '2027-09-20' },
  { ky: '9/2027',  deadline: '2027-10-20' },
  { ky: '10/2027', deadline: '2027-11-22' },
  { ky: '11/2027', deadline: '2027-12-20' }
]));

// ── 3. Khai thuế GTGT theo quý ────────────────────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Khai thuế GTGT ${ky}`,
  descFn: ky => `Doanh nghiệp nhỏ khai thuế GTGT theo quý cho ${ky}.`,
  category: 'tax', frequency: 'quarterly', priority: 'high',
  legal: LEGAL_GTGT_TNCN, penalty: PEN_TAX, steps: STEPS_GTGT_QUARTERLY
}, [
  { ky: 'quý 4/2026', deadline: '2027-02-01' },  // 31/1 Sun → 1/2 Mon
  { ky: 'quý 1/2027', deadline: '2027-04-30' },
  { ky: 'quý 2/2027', deadline: '2027-08-02' },  // 31/7 Sat → 2/8 Mon
  { ky: 'quý 3/2027', deadline: '2027-11-01' }   // 31/10 Sun → 1/11 Mon
]));

// ── 4. Khai thuế TNCN khấu trừ theo quý ──────────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Khai thuế TNCN khấu trừ ${ky}`,
  descFn: ky => `Tổ chức trả thu nhập khai TNCN khấu trừ theo quý cho ${ky}.`,
  category: 'tax', frequency: 'quarterly', priority: 'high',
  legal: LEGAL_GTGT_TNCN, penalty: PEN_TAX, steps: STEPS_TNCN_QUARTERLY
}, [
  { ky: 'quý 4/2026', deadline: '2027-02-01' },
  { ky: 'quý 1/2027', deadline: '2027-04-30' },
  { ky: 'quý 2/2027', deadline: '2027-08-02' },
  { ky: 'quý 3/2027', deadline: '2027-11-01' }
]));

// ── 5. Tạm nộp thuế TNDN theo quý ─────────────────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Tạm nộp thuế TNDN ${ky}`,
  descFn: ky => `Doanh nghiệp tự xác định và tạm nộp thuế TNDN ${ky}.`,
  category: 'tax', frequency: 'quarterly', priority: 'high',
  legal: LEGAL_TNDN_PROV,
  penalty: 'Không có tờ khai nên không phạt chậm nộp hồ sơ; nếu thiếu so với 80% quyết toán thì 0,03%/ngày trên số thiếu (Điều 59 Luật QLT). Xem chi tiết tại văn bản được trích dẫn.',
  steps: STEPS_TNDN_PROVISIONAL
}, [
  { ky: 'quý 4/2026', deadline: '2027-02-01' },  // 30/1 Sat → 1/2 Mon
  { ky: 'quý 1/2027', deadline: '2027-04-30' },
  { ky: 'quý 2/2027', deadline: '2027-07-30' },
  { ky: 'quý 3/2027', deadline: '2027-11-01' }   // 30/10 Sat → 1/11 Mon
]));

// ── 6. BHXH/BHYT/BHTN theo tháng (hạn cuối tháng đó) ─────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Trích nộp BHXH, BHYT, BHTN kỳ tháng ${ky}`,
  descFn: ky => `Hằng tháng doanh nghiệp trích và chuyển tiền đóng BHXH, BHYT, BHTN bắt buộc kỳ tháng ${ky}.`,
  category: 'insurance', frequency: 'monthly', priority: 'high',
  legal: LEGAL_BHXH, penalty: PEN_BHXH, steps: STEPS_BHXH_MONTHLY
}, [
  { ky: '1/2027',  deadline: '2027-02-01' },  // 31/1 Sun → 1/2 Mon
  { ky: '2/2027',  deadline: '2027-03-01' },  // 28/2 Sun → 1/3 Mon
  { ky: '3/2027',  deadline: '2027-03-31' },
  { ky: '4/2027',  deadline: '2027-04-30' },
  { ky: '5/2027',  deadline: '2027-05-31' },
  { ky: '6/2027',  deadline: '2027-06-30' },
  { ky: '7/2027',  deadline: '2027-08-02' },  // 31/7 Sat → 2/8 Mon
  { ky: '8/2027',  deadline: '2027-08-31' },
  { ky: '9/2027',  deadline: '2027-09-30' },
  { ky: '10/2027', deadline: '2027-11-01' },  // 31/10 Sun → 1/11 Mon
  { ky: '11/2027', deadline: '2027-11-30' },
  { ky: '12/2027', deadline: '2027-12-31' }
]));

// ── 7. KPCĐ 2% kỳ tháng X — hạn cuối tháng X+1 ────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng ${ky}`,
  descFn: ky => `DN đóng KPCĐ 2% quỹ lương đóng BHXH kỳ tháng ${ky}; hạn cuối tháng kế tiếp.`,
  category: 'insurance', frequency: 'monthly', priority: 'medium',
  legal: LEGAL_KPCD, penalty: PEN_KPCD, steps: STEPS_KPCD_MONTHLY
}, [
  { ky: '12/2026', deadline: '2027-02-01' },  // 31/1 Sun → 1/2 Mon
  { ky: '1/2027',  deadline: '2027-03-01' },
  { ky: '2/2027',  deadline: '2027-03-31' },
  { ky: '3/2027',  deadline: '2027-04-30' },
  { ky: '4/2027',  deadline: '2027-05-31' },
  { ky: '5/2027',  deadline: '2027-06-30' },
  { ky: '6/2027',  deadline: '2027-08-02' },
  { ky: '7/2027',  deadline: '2027-08-31' },
  { ky: '8/2027',  deadline: '2027-09-30' },
  { ky: '9/2027',  deadline: '2027-11-01' },
  { ky: '10/2027', deadline: '2027-11-30' },
  { ky: '11/2027', deadline: '2027-12-31' }
]));

// ── 8. Thông báo biến động lao động kỳ tháng X — hạn 3 tháng X+1 ─────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Thông báo biến động lao động kỳ tháng ${ky}`,
  descFn: ky => `Thông báo biến động lao động kỳ tháng ${ky} với Trung tâm Dịch vụ việc làm.`,
  category: 'labor', frequency: 'monthly', priority: 'medium',
  legal: LEGAL_BIENDONG, penalty: PEN_BIENDONG, steps: STEPS_BIENDONG_LAODONG
}, [
  { ky: '12/2026', deadline: '2027-01-04' },  // 3/1 Sun → 4/1 Mon
  { ky: '1/2027',  deadline: '2027-02-03' },
  { ky: '2/2027',  deadline: '2027-03-03' },
  { ky: '3/2027',  deadline: '2027-04-05' },  // 3/4 Sat, 4/4 Sun → 5/4 Mon
  { ky: '4/2027',  deadline: '2027-05-03' },
  { ky: '5/2027',  deadline: '2027-06-03' },
  { ky: '6/2027',  deadline: '2027-07-05' },  // 3/7 Sat, 4/7 Sun → 5/7 Mon
  { ky: '7/2027',  deadline: '2027-08-03' },
  { ky: '8/2027',  deadline: '2027-09-03' },
  { ky: '9/2027',  deadline: '2027-10-04' },  // 3/10 Sun → 4/10 Mon
  { ky: '10/2027', deadline: '2027-11-03' },
  { ky: '11/2027', deadline: '2027-12-03' }
]));

// ── 9. Phí BVMT nước thải theo quý ────────────────────────────────────────
GENERAL_RECURRING_2027.push(...buildMonthly({
  titleFn: ky => `Kê khai phí bảo vệ môi trường đối với nước thải ${ky}`,
  descFn: ky => `Tổ chức/cá nhân xả nước thải công nghiệp thuộc đối tượng kê khai phí BVMT thực hiện kê khai số liệu xả thải ${ky} và nộp phí.`,
  category: 'environment', frequency: 'quarterly', priority: 'medium',
  legal: LEGAL_PHIBVMT, penalty: PEN_PHIBVMT, steps: STEPS_PHIBVMT_NUOCTHAI
}, [
  { ky: 'Q4/2026', deadline: '2027-02-01' },  // 30/1 Sat → 1/2 Mon
  { ky: 'Q1/2027', deadline: '2027-04-30' },
  { ky: 'Q2/2027', deadline: '2027-07-30' },
  { ky: 'Q3/2027', deadline: '2027-11-01' }   // 30/10 Sat → 1/11 Mon
]));

// ── 10. Các nghĩa vụ đơn lẻ (quyết toán, BC năm, BC nửa năm…) ─────────────
const GENERAL_ONE_OFF_2027 = [
  {
    title: 'Nộp lệ phí môn bài năm 2027',
    deadline: '2027-02-01',  // 30/1 Sat → 1/2 Mon (DN không thuộc diện miễn)
    category: 'tax', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Tổ chức kinh doanh (không thuộc đối tượng miễn) nộp lệ phí môn bài chậm nhất ngày 30/01 hằng năm. Năm 2027 hạn rơi 1/2 do 30/1 và 31/1 trùng thứ Bảy/Chủ nhật.',
    legal_basis: 'Điều 5 Nghị định 139/2016/NĐ-CP về lệ phí môn bài (sửa đổi NĐ 22/2020/NĐ-CP); Điều 18 Nghị định 126/2020/NĐ-CP.',
    penalty: 'Chậm nộp: tiền chậm nộp 0,03%/ngày trên số lệ phí chậm nộp (Điều 59 Luật QLT). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Xác định mức lệ phí môn bài theo vốn điều lệ/vốn đầu tư trên GCN ĐKDN',
      'Lập giấy nộp tiền (mã chương 757/758, tiểu mục 2862/2863) trên Cổng thanh toán điện tử Tổng cục Thuế',
      'Nộp tiền qua tài khoản ngân hàng của Kho bạc Nhà nước',
      'Hạch toán chi phí lệ phí môn bài vào sổ kế toán',
      'Lưu ý: tờ khai lệ phí môn bài chỉ nộp lần đầu hoặc khi có thay đổi vốn — hằng năm không phải khai lại'
    ]
  },
  {
    title: 'Quyết toán thuế TNDN năm 2026',
    deadline: '2027-03-31',
    category: 'tax', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Doanh nghiệp nộp tờ khai quyết toán thuế TNDN năm 2026 và nộp số thuế còn thiếu (nếu có) chậm nhất ngày cuối cùng của tháng thứ 3 kể từ kết thúc năm tài chính. Áp dụng cho DN có năm tài chính = năm dương lịch.',
    legal_basis: 'Điểm a Khoản 2 Điều 44 Luật Quản lý thuế 38/2019/QH14; Thông tư 80/2021/TT-BTC; áp dụng quy định mới của Luật QLT 108/2025/QH15 từ 01/7/2026.',
    penalty: PEN_TAX,
    steps: [
      'Khóa sổ kế toán năm 2026, đối chiếu số dư các tài khoản trọng yếu',
      'Lập tờ khai quyết toán Mẫu 03/TNDN cùng các phụ lục trên HTKK/eTax',
      'Tính nghĩa vụ TNDN cả năm, đối chiếu với tổng tạm nộp 4 quý (phải đạt ≥ 80%)',
      'Ký số và nộp tờ khai qua thuedientu.gdt.gov.vn trước 31/3/2027',
      'Nộp số thuế còn thiếu/đề nghị hoàn nếu nộp thừa và lưu BCTC kèm theo'
    ]
  },
  {
    title: 'Quyết toán thuế TNDN năm 2026 — Nộp BCTC kèm theo',
    deadline: '2027-03-31',
    category: 'report', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cùng với tờ khai quyết toán TNDN, doanh nghiệp phải nộp Báo cáo tài chính năm 2026 cho cơ quan thuế. DN thuộc diện kiểm toán bắt buộc phải kèm Báo cáo kiểm toán độc lập.',
    legal_basis: 'Điều 109 Luật Doanh nghiệp 59/2020/QH14 (sửa đổi 76/2025/QH15); Điều 80 Thông tư 200/2014/TT-BTC; Điều 37 Luật Kiểm toán độc lập 67/2011/QH12.',
    penalty: 'Nộp BCTC chậm: phạt 20-30 triệu theo Nghị định 41/2018/NĐ-CP (sửa đổi NĐ 102/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Hoàn tất kiểm toán độc lập BCTC năm 2026 (đối với DN thuộc diện bắt buộc)',
      'Lập bộ BCTC đầy đủ: Bảng CĐKT, KQHĐKD, LCTT, Thuyết minh',
      'Đính kèm BCTC vào hồ sơ quyết toán thuế TNDN trên thuedientu',
      'Đồng thời nộp BCTC qua Cổng đăng ký kinh doanh https://dangkykinhdoanh.gov.vn (đối với DN không có vốn nhà nước)',
      'Lưu bản chính BCTC + Báo cáo kiểm toán tại doanh nghiệp tối thiểu 10 năm'
    ]
  },
  {
    title: 'Cá nhân tự quyết toán thuế TNCN năm 2026',
    deadline: '2027-05-04',  // 30/4 holiday → 3/5 Mon nghỉ bù → 4/5 Tue (90 ngày từ 31/12/2026 = 31/3 nếu cá nhân uỷ quyền QT)
    category: 'tax', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cá nhân có thu nhập từ tiền lương, tiền công tự quyết toán TNCN năm 2026 chậm nhất ngày cuối cùng của tháng thứ 4 kể từ ngày kết thúc năm dương lịch. Năm 2027 hạn 30/4 rơi vào ngày lễ + nghỉ bù → 4/5/2027 (Thứ Ba).',
    legal_basis: 'Điểm b Khoản 2 Điều 44 Luật Quản lý thuế 38/2019/QH14; Thông tư 111/2013/TT-BTC; áp dụng quy định mới của Luật TNCN 109/2025/QH15 từ 01/7/2026.',
    penalty: PEN_TAX,
    steps: [
      'Tập hợp chứng từ thu nhập, chứng từ khấu trừ thuế cả năm 2026',
      'Tính lại nghĩa vụ TNCN cả năm theo biểu thuế 5 bậc mới (Luật TNCN 109/2025) và đối chiếu với số đã khấu trừ',
      'Đăng ký giảm trừ gia cảnh cho người phụ thuộc (15,5tr cá nhân + 6,2tr/người phụ thuộc theo Luật mới)',
      'Lập tờ khai 02/QTT-TNCN và nộp qua thuedientu.gdt.gov.vn hoặc Cổng dịch vụ công',
      'Nộp bổ sung hoặc đề nghị hoàn thuế nếu phát sinh chênh lệch'
    ]
  },
  {
    title: 'Báo cáo công tác bảo vệ môi trường năm 2026',
    deadline: '2027-01-15',
    category: 'environment', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở SX, KD, dịch vụ có Giấy phép môi trường/đăng ký môi trường phải lập và gửi báo cáo công tác BVMT năm 2026 cho Sở TN&MT trước 15/01/2027.',
    legal_basis: 'Điều 119 Luật Bảo vệ môi trường 72/2020/QH14; Điều 66 Thông tư 02/2022/TT-BTNMT (sửa đổi TT 07/2025/TT-BTNMT).',
    penalty: 'Không lập/báo cáo công tác BVMT: phạt 10-20 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 45/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số liệu năm 2026: lượng nguyên liệu sử dụng, chất thải phát sinh (rắn, lỏng, khí, CTNH)',
      'Tổng hợp kết quả quan trắc môi trường định kỳ trong năm',
      'Lập báo cáo theo Phụ lục VI Thông tư 02/2022/TT-BTNMT',
      'Gửi qua Hệ thống thông tin EMC của Bộ TN&MT cho Sở TN&MT/Bộ TN&MT theo phân cấp',
      'Lưu báo cáo và minh chứng quan trắc, chuyển giao chất thải'
    ]
  },
  {
    title: 'Báo cáo công tác an toàn, vệ sinh lao động năm 2026',
    deadline: '2027-01-11',  // 10/1 Sun → 11 Mon
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở SX, KD báo cáo công tác ATVSLĐ năm 2026 cho Sở Lao động (Sở Nội vụ sau hợp nhất). Báo cáo chốt từ 15/12/2025 đến 14/12/2026.',
    legal_basis: 'Khoản 2 Điều 10 Thông tư 07/2016/TT-BLĐTBXH; Điều 81 Luật An toàn, vệ sinh lao động 84/2015/QH13.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP về XPHC trong lĩnh vực lao động. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số người được huấn luyện ATVSLĐ trong năm theo từng nhóm',
      'Tổng hợp tình hình khám sức khỏe định kỳ, khám phát hiện bệnh nghề nghiệp',
      'Tổng hợp số máy/thiết bị đã kiểm định, kết quả quan trắc MTLĐ',
      'Lập báo cáo theo Mẫu của TT 07/2016/TT-BLĐTBXH',
      'Gửi Sở Lao động/Sở Nội vụ qua Cổng dịch vụ công trước 10/1/2027'
    ]
  },
  {
    title: 'Báo cáo y tế lao động năm 2026',
    deadline: '2027-01-11',  // 10/1 Sun → 11 Mon
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở báo cáo y tế lao động năm 2026: tình hình sức khỏe người LĐ, khám phát hiện bệnh nghề nghiệp, vệ sinh lao động.',
    legal_basis: 'Điều 10 Thông tư 19/2016/TT-BYT về y tế lao động.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 117/2020/NĐ-CP về XPHC trong lĩnh vực y tế. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp danh sách người được khám sức khỏe định kỳ trong năm 2026',
      'Tổng hợp kết quả khám phát hiện bệnh nghề nghiệp',
      'Lập báo cáo theo Phụ lục 8 Thông tư 19/2016/TT-BYT',
      'Gửi Trung tâm Kiểm soát bệnh tật (CDC) cấp tỉnh và Sở Y tế',
      'Lưu hồ sơ vệ sinh lao động và sức khỏe người lao động'
    ]
  },
  {
    title: 'Báo cáo tổng hợp tình hình tai nạn lao động năm 2026',
    deadline: '2027-01-11',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở báo cáo tổng hợp tình hình TNLĐ năm 2026 cho Sở Lao động (Sở Nội vụ sau hợp nhất) trước 10/01/2027.',
    legal_basis: 'Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP về hướng dẫn Luật ATVSLĐ.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tập hợp biên bản điều tra TNLĐ phát sinh trong năm',
      'Phân loại theo mức độ: nhẹ, nặng, chết người',
      'Lập báo cáo theo Phụ lục XII Nghị định 39/2016/NĐ-CP',
      'Gửi Sở Lao động (Sở Nội vụ sau hợp nhất) qua Cổng DVC',
      'Lưu bản chính tại doanh nghiệp'
    ]
  },
  {
    title: 'Công bố tình hình tai nạn lao động cả năm 2026',
    deadline: '2027-01-14',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở công bố tình hình TNLĐ xảy ra trong năm 2026 cho người lao động trong cơ sở.',
    legal_basis: 'Điểm a Khoản 1 Điều 4 Thông tư 13/2020/TT-BLĐTBXH.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số liệu TNLĐ tại cơ sở trong cả năm 2026',
      'Niêm yết công khai tại trụ sở và nơi làm việc',
      'Gửi báo cáo công bố cho Sở LĐ (Sở Nội vụ)',
      'Lưu bản công bố và biên bản niêm yết'
    ]
  },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý IV/2026',
    deadline: '2027-01-11',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'quarterly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo tình hình thực hiện dự án đầu tư Quý IV/2026 cho cơ quan đăng ký đầu tư.',
    legal_basis: 'Khoản 2 Điều 102 Nghị định 31/2021/NĐ-CP về thi hành Luật Đầu tư.',
    penalty: 'Phạt 30-50 triệu (tổ chức) đối với hành vi không báo cáo theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật tiến độ thực hiện dự án và giải ngân vốn đầu tư trong Q4',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  {
    title: 'Báo cáo giám sát, đánh giá đầu tư năm 2026',
    deadline: '2027-02-10',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo giám sát, đánh giá đầu tư cả năm 2026 cho cơ quan đăng ký đầu tư trước 10/02/2027.',
    legal_basis: 'Điều 100 Nghị định 29/2021/NĐ-CP về giám sát và đánh giá đầu tư.',
    penalty: 'Phạt 20-30 triệu (tổ chức) theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp tiến độ thực hiện và tình hình chấp hành pháp luật đầu tư cả năm',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT',
      'Gửi cơ quan đăng ký đầu tư qua Hệ thống thông tin quốc gia về đầu tư',
      'Lưu báo cáo và minh chứng kèm theo'
    ]
  },
  {
    title: 'Báo cáo tình hình sử dụng lao động 6 tháng đầu năm 2027',
    deadline: '2027-06-04',  // trước 5/6 (Sat) → 4/6 Fri
    category: 'labor', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Báo cáo tình hình sử dụng lao động 6 tháng đầu năm 2027 (Mẫu 01/PLI) gửi Sở Nội vụ (sau hợp nhất Sở LĐ-TB&XH) và cơ quan BHXH trước 05/6/2027.',
    legal_basis: 'Khoản 2 Điều 4 Nghị định 145/2020/NĐ-CP, sửa đổi NĐ 35/2022/NĐ-CP; Mẫu 01/PLI.',
    penalty: 'Tổ chức 10-20 triệu (cá nhân 5-10 triệu) theo điểm c khoản 2 Điều 8 Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật danh sách lao động đến 30/6/2027',
      'Lập báo cáo theo Mẫu 01/PLI (Phụ lục I NĐ 145/2020/NĐ-CP)',
      'Nộp qua Cổng dịch vụ công về việc làm cho Sở Nội vụ trước 05/6',
      'Đồng thời gửi cơ quan BHXH cấp huyện nơi đặt trụ sở',
      'Lưu báo cáo và biên nhận điện tử'
    ]
  },
  {
    title: 'Báo cáo tình hình sử dụng lao động cả năm 2027',
    deadline: '2027-12-03',  // trước 5/12 (Sun) → 3/12 Fri
    category: 'labor', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Báo cáo tình hình sử dụng lao động cả năm 2027 (Mẫu 01/PLI) gửi Sở Nội vụ và cơ quan BHXH trước 05/12/2027.',
    legal_basis: 'Khoản 2 Điều 4 Nghị định 145/2020/NĐ-CP, sửa đổi NĐ 35/2022/NĐ-CP; Mẫu 01/PLI.',
    penalty: 'Tổ chức 10-20 triệu (cá nhân 5-10 triệu) theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật danh sách lao động đến 31/12/2027',
      'Lập báo cáo theo Mẫu 01/PLI',
      'Nộp qua Cổng dịch vụ công về việc làm cho Sở Nội vụ trước 05/12',
      'Đồng thời gửi cơ quan BHXH cấp huyện',
      'Lưu báo cáo và biên nhận điện tử'
    ]
  },
  {
    title: 'Báo cáo kết quả thực hiện công tác PCCC 6 tháng đầu năm 2027',
    deadline: '2027-06-14',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở thuộc diện quản lý PCCC báo cáo công tác PCCC 6 tháng đầu năm 2027 cho cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn.',
    legal_basis: 'Luật PCCC&CNCH 55/2024/QH15 (hiệu lực 01/07/2025); Nghị định 105/2025/NĐ-CP.',
    penalty: 'Vi phạm PCCC: xử phạt theo Nghị định 144/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tập hợp hồ sơ kiểm tra, bảo trì hệ thống báo cháy/chữa cháy, lối thoát hiểm trong 6 tháng',
      'Đánh giá tình trạng phương tiện, lực lượng PCCC cơ sở',
      'Lập báo cáo theo mẫu của Luật PCCC&CNCH 55/2024 và Nghị định 105/2025/NĐ-CP',
      'Gửi cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn',
      'Lưu bản sao tại cơ sở phục vụ hậu kiểm'
    ]
  },
  {
    title: 'Báo cáo kết quả thực hiện công tác PCCC năm 2027',
    deadline: '2027-12-14',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở thuộc diện quản lý PCCC báo cáo tổng hợp công tác PCCC cả năm 2027.',
    legal_basis: 'Luật PCCC&CNCH 55/2024/QH15; Nghị định 105/2025/NĐ-CP.',
    penalty: 'Vi phạm PCCC: xử phạt theo Nghị định 144/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp toàn bộ hoạt động PCCC cả năm: kiểm tra, bảo trì, huấn luyện, sự cố',
      'Đánh giá năng lực PCCC tại chỗ và tồn tại cần khắc phục năm sau',
      'Lập báo cáo theo mẫu của Luật PCCC&CNCH 55/2024 và Nghị định 105/2025/NĐ-CP',
      'Gửi cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn',
      'Lưu bản sao tại cơ sở'
    ]
  },
  {
    title: 'Báo cáo y tế lao động 6 tháng đầu năm 2027',
    deadline: '2027-07-05',  // trước 5/7 (Mon)
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở báo cáo y tế lao động 6 tháng đầu năm 2027.',
    legal_basis: 'Điều 10 Thông tư 19/2016/TT-BYT về y tế lao động.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 117/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp danh sách lao động được khám sức khỏe định kỳ trong 6 tháng đầu năm',
      'Cập nhật hồ sơ khám phát hiện bệnh nghề nghiệp (nếu có)',
      'Lập báo cáo theo Phụ lục 8 Thông tư 19/2016/TT-BYT',
      'Gửi Trung tâm CDC cấp tỉnh và Sở Y tế trước 05/7/2027',
      'Lưu hồ sơ vệ sinh lao động'
    ]
  },
  {
    title: 'Báo cáo tổng hợp tình hình TNLĐ 6 tháng đầu năm 2027',
    deadline: '2027-07-05',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'high',
    description: 'Cơ sở báo cáo tổng hợp tình hình TNLĐ 6 tháng đầu năm 2027.',
    legal_basis: 'Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tập hợp biên bản điều tra TNLĐ phát sinh trong 6 tháng',
      'Phân loại theo mức độ: nhẹ, nặng, chết người',
      'Lập báo cáo theo Phụ lục XII NĐ 39/2016/NĐ-CP',
      'Gửi Sở Lao động (Sở Nội vụ) trước 05/7/2027',
      'Lưu bản chính tại doanh nghiệp'
    ]
  },
  {
    title: 'Công bố tình hình TNLĐ 6 tháng đầu năm 2027',
    deadline: '2027-07-09',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở công bố tình hình TNLĐ xảy ra tại cơ sở trong 6 tháng đầu năm 2027 cho người lao động.',
    legal_basis: 'Điểm a Khoản 1 Điều 4 Thông tư 13/2020/TT-BLĐTBXH.',
    penalty: 'Phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số liệu TNLĐ tại cơ sở trong 6 tháng',
      'Niêm yết công khai tại trụ sở và nơi làm việc',
      'Gửi báo cáo công bố cho Sở LĐ (Sở Nội vụ)',
      'Lưu bản công bố và biên bản niêm yết'
    ]
  },
  {
    title: 'Báo cáo giám sát, đánh giá đầu tư 6 tháng đầu năm 2027',
    deadline: '2027-07-09',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo giám sát, đánh giá đầu tư 6 tháng đầu năm 2027.',
    legal_basis: 'Điều 100 Nghị định 29/2021/NĐ-CP về giám sát và đánh giá đầu tư.',
    penalty: 'Phạt 20-30 triệu (tổ chức) theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp tiến độ thực hiện và tình hình chấp hành pháp luật đầu tư trong kỳ',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT',
      'Gửi cơ quan đăng ký đầu tư qua Hệ thống thông tin quốc gia về đầu tư',
      'Lưu báo cáo và minh chứng kèm theo'
    ]
  },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý I/2027',
    deadline: '2027-04-09',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'quarterly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo tình hình thực hiện dự án đầu tư Quý I/2027.',
    legal_basis: 'Khoản 2 Điều 102 Nghị định 31/2021/NĐ-CP.',
    penalty: 'Phạt 30-50 triệu (tổ chức) theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật tiến độ thực hiện và giải ngân vốn Q1/2027',
      'Lập báo cáo Mẫu A.III.1 Phụ lục III TT 03/2021/TT-BKHĐT',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý II/2027',
    deadline: '2027-07-09',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'quarterly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo tình hình thực hiện dự án đầu tư Quý II/2027.',
    legal_basis: 'Khoản 2 Điều 102 Nghị định 31/2021/NĐ-CP.',
    penalty: 'Phạt 30-50 triệu (tổ chức) theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật tiến độ thực hiện và giải ngân vốn Q2/2027',
      'Lập báo cáo Mẫu A.III.1 Phụ lục III TT 03/2021/TT-BKHĐT',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý III/2027',
    deadline: '2027-10-08',
    category: 'investment', scope: 'general', industry: null,
    frequency: 'quarterly', priority: 'medium',
    description: 'Chủ đầu tư báo cáo tình hình thực hiện dự án đầu tư Quý III/2027.',
    legal_basis: 'Khoản 2 Điều 102 Nghị định 31/2021/NĐ-CP.',
    penalty: 'Phạt 30-50 triệu (tổ chức) theo Nghị định 122/2021/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật tiến độ thực hiện và giải ngân vốn Q3/2027',
      'Lập báo cáo Mẫu A.III.1 Phụ lục III TT 03/2021/TT-BKHĐT',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  {
    title: 'Báo cáo kết quả triển khai Tháng hành động ATVSLĐ năm 2027',
    deadline: '2027-07-14',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở tổng hợp kết quả các hoạt động Tháng hành động ATVSLĐ năm 2027.',
    legal_basis: 'Hướng dẫn hằng năm của Bộ Lao động (Cục An toàn lao động) về Tháng hành động ATVSLĐ.',
    penalty: 'Có thể bị nhắc nhở, xử lý vi phạm hành chính nếu không tham gia theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp kết quả các hoạt động Tháng hành động ATVSLĐ tại cơ sở (tuyên truyền, huấn luyện, khám sức khỏe, kiểm tra)',
      'Lập báo cáo theo hướng dẫn hằng năm của Cục An toàn lao động',
      'Gửi Sở Lao động (Sở Nội vụ) qua Cổng dịch vụ công',
      'Lưu hồ sơ tài liệu, hình ảnh kèm theo'
    ]
  },
  {
    title: 'Báo cáo kiểm soát và bảo đảm an toàn bức xạ năm 2027',
    deadline: '2027-11-30',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở có sử dụng nguồn bức xạ báo cáo công tác kiểm soát và bảo đảm an toàn bức xạ năm 2027.',
    legal_basis: 'Khoản 1 Điều 20 Thông tư 19/2012/TT-BKHCN về kiểm soát và bảo đảm an toàn bức xạ.',
    penalty: 'Phạt 10-20 triệu đồng theo Nghị định 107/2013/NĐ-CP (sửa đổi NĐ 124/2021). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật danh sách nguồn bức xạ, thiết bị bức xạ tại cơ sở',
      'Tổng hợp kết quả đo liều cá nhân, kiểm xạ định kỳ trong năm',
      'Lập báo cáo theo Phụ lục Thông tư 19/2012/TT-BKHCN',
      'Gửi Cục An toàn bức xạ và hạt nhân (Bộ KH&CN) và Sở KH&CN địa phương',
      'Lưu hồ sơ tại cơ sở'
    ]
  },
  {
    title: 'Báo cáo thực trạng an toàn tiến hành công việc bức xạ năm 2027',
    deadline: '2027-11-30',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở báo cáo thực trạng an toàn tiến hành công việc bức xạ năm 2027.',
    legal_basis: 'Khoản 1 Điều 20 Thông tư 19/2012/TT-BKHCN.',
    penalty: 'Phạt 10-20 triệu đồng theo Nghị định 107/2013/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Đánh giá việc chấp hành các điều kiện an toàn bức xạ tại cơ sở',
      'Tổng hợp số liệu đo liều cá nhân, kiểm xạ môi trường làm việc',
      'Lập báo cáo theo Khoản 1 Điều 20 Thông tư 19/2012/TT-BKHCN',
      'Gửi Cục An toàn bức xạ và hạt nhân và Sở KH&CN trước 30/11',
      'Lưu báo cáo và hồ sơ kết quả đo liều'
    ]
  },
  {
    title: 'Báo cáo mức giảm phát thải khí nhà kính năm 2027',
    deadline: '2027-12-30',
    category: 'environment', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Áp dụng cho cơ sở thuộc danh mục phải kiểm kê KNK báo cáo kết quả giảm phát thải năm 2027.',
    legal_basis: 'Nghị định 06/2022/NĐ-CP về giảm nhẹ phát thải KNK; Quyết định 13/2024/QĐ-TTg về Danh mục cơ sở phát thải.',
    penalty: 'Vi phạm bị xử phạt theo Nghị định 45/2022/NĐ-CP về XPHC trong lĩnh vực BVMT. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Áp dụng cho cơ sở thuộc Danh mục kiểm kê KNK (QĐ 13/2024/QĐ-TTg và cập nhật)',
      'Đo đạc, tính toán lượng phát thải KNK theo phương pháp IPCC và hệ số phát thải VN',
      'Lập báo cáo theo Mẫu Nghị định 06/2022/NĐ-CP',
      'Nộp qua Hệ thống thông tin quốc gia về biến đổi khí hậu hoặc cho Bộ TN&MT',
      'Lưu chứng từ quan trắc, hệ số phát thải, dữ liệu hoạt động'
    ]
  },
  {
    title: 'Báo cáo thực hiện công tác quan trắc môi trường lao động năm 2027',
    deadline: '2027-12-30',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở tổng hợp kết quả quan trắc môi trường lao động đã thực hiện trong năm 2027.',
    legal_basis: 'Nghị định 44/2016/NĐ-CP về Luật ATVSLĐ; Nghị định 39/2016/NĐ-CP.',
    penalty: 'Phạt 10-20 triệu (tổ chức) theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp kết quả quan trắc MTLĐ (vi khí hậu, ánh sáng, tiếng ồn, bụi, hóa chất)',
      'So sánh với QCVN của Bộ Y tế về vệ sinh lao động',
      'Lập báo cáo theo NĐ 44/2016/NĐ-CP và NĐ 39/2016/NĐ-CP',
      'Lưu hồ sơ vệ sinh lao động tại cơ sở; gửi Sở Y tế và Sở LĐ khi yêu cầu',
      'Thực hiện biện pháp khắc phục đối với chỉ tiêu vượt ngưỡng'
    ]
  },
  {
    title: 'Báo cáo công tác kiểm định kỹ thuật ATLĐ, huấn luyện ATVSLĐ năm 2027',
    deadline: '2027-12-30',
    category: 'safety', scope: 'general', industry: null,
    frequency: 'yearly', priority: 'medium',
    description: 'Cơ sở/đơn vị cung cấp dịch vụ huấn luyện/kiểm định báo cáo công tác trong năm 2027.',
    legal_basis: 'Nghị định 44/2016/NĐ-CP về Luật ATVSLĐ.',
    penalty: 'Có thể bị xử phạt hành chính theo Nghị định 12/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số máy/thiết bị đã kiểm định trong năm',
      'Tổng hợp số người được huấn luyện theo từng nhóm (1-6) theo NĐ 44/2016',
      'Lập báo cáo theo Mẫu của NĐ 44/2016/NĐ-CP',
      'Gửi Sở LĐ và Bộ LĐ khi được yêu cầu',
      'Lưu hồ sơ kiểm định, chứng chỉ huấn luyện'
    ]
  }
];

GENERAL_RECURRING_2027.push(...GENERAL_ONE_OFF_2027);

// ── Holidays + recurring tổng hợp ────────────────────────────────────────
const LO_A_ENTRIES = [
  ...HOLIDAYS_2027.map(h => ({
    ...h,
    scope: 'general', industry: null, frequency: 'yearly', priority: 'high',
    steps: STEPS_HOLIDAY,
    applies_to: 'all'
  })),
  ...GENERAL_RECURRING_2027
];

// ── Seed runner ────────────────────────────────────────────────────────────
let last2027SeedResult = { status: 'not_run' };

async function seed2027(client, log) {
  const allEntries = [
    ...LO_A_ENTRIES.map(e => ({ ...e, _batch: 'lo_a_general_holidays' }))
  ];

  let inserted = 0;
  let skipped = 0;
  const errors = [];
  const byBatch = {};

  for (const ev of allEntries) {
    try {
      const exists = await client.query(
        `SELECT 1 FROM events WHERE title = $1 AND deadline = $2::date LIMIT 1`,
        [ev.title, ev.deadline]
      );
      if (exists.rowCount > 0) {
        skipped += 1;
        continue;
      }
      await client.query(
        `INSERT INTO events
           (title, description, category, deadline, frequency, legal_basis, penalty,
            applies_to, priority, reminder_days, scope, industry, steps,
            source, source_url, is_active)
         VALUES
           ($1, $2, $3, $4::date, $5, $6, $7,
            $8, $9, 7, $10, $11, $12::jsonb,
            $13, $14, true)`,
        [
          ev.title,
          ev.description || null,
          ev.category || 'other',
          ev.deadline,
          ev.frequency || null,
          ev.legal_basis || null,
          ev.penalty || null,
          ev.applies_to || 'business',
          ev.priority || 'medium',
          ev.scope || 'general',
          ev.industry || null,
          JSON.stringify(ev.steps || []),
          ev.source || null,
          ev.source_url || null
        ]
      );
      inserted += 1;
      byBatch[ev._batch] = (byBatch[ev._batch] || 0) + 1;
    } catch (err) {
      errors.push({ batch: ev._batch, title: ev.title, deadline: ev.deadline, error: err.message });
      if (log) log('ERROR', 'Seed 2027 insert failed', { batch: ev._batch, title: ev.title, deadline: ev.deadline, error: err.message });
    }
  }

  last2027SeedResult = {
    status: 'ok',
    ran_at: new Date().toISOString(),
    total_entries: allEntries.length,
    inserted,
    skipped_existing: skipped,
    by_batch: byBatch,
    errors
  };
  if (log) log('INFO', 'Seed 2027 completed', last2027SeedResult);
  return last2027SeedResult;
}

function getLast2027SeedResult() {
  return last2027SeedResult;
}

module.exports = {
  seed2027,
  getLast2027SeedResult
};

// ═══════════════════════════════════════════════════════════════════════════
// CẦN XÁC MINH (KHÔNG ghi DB)
// ───────────────────────────────────────────────────────────────────────────
// - Lịch nghỉ bù chính thức cho Tết Đinh Mùi 2027 và 1/5/2027 do Thủ tướng
//   quyết định cuối năm 2026 — hiện chỉ ghi 5 ngày canonical theo BLLĐ Đ.112.
// - 1 ngày liền kề Quốc khánh 2/9/2027 (trước hoặc sau) — Chính phủ quyết.
// - Số NĐ hướng dẫn Luật Công đoàn 50/2024 (DB cũ ghi NĐ 105/2026/NĐ-CP —
//   chưa kiểm tra trực tiếp).
// - Mẫu mới thay Mẫu 29 theo NĐ 352/2025/NĐ-CP về biến động lao động —
//   step đã viết "Mẫu 29 hoặc mẫu mới" để DN tự chọn theo thời điểm.
// - Tên cơ quan tiếp nhận sau hợp nhất 2025-2026 (Sở Nội vụ thay Sở LĐ-TB&XH;
//   Bộ KH&CN thay Bộ TT&TT) — chưa xác nhận có hợp nhất chính thức chưa.
// ═══════════════════════════════════════════════════════════════════════════

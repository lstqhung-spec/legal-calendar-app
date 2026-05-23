// ═══════════════════════════════════════════════════════════════════════════
// SEED: Backfill "Hướng dẫn thực hiện" (steps) cho lịch nửa cuối 2026
// ───────────────────────────────────────────────────────────────────────────
// Idempotent: chỉ UPDATE khi steps trống. Khóa theo (title, deadline).
// Mọi step viết theo căn cứ pháp luật đã ghi tại trường legal_basis của event
// tương ứng trên DB Production. Mục nào CHƯA chắc chắn → KHÔNG có ở đây
// (xem README block cuối file "CẦN XÁC MINH").
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
  'Lưu ý: tổng số tạm nộp 4 quý phải ≥ 80% nghĩa vụ TNDN cả năm để tránh tiền chậm nộp 0,03%/ngày (Điều 8 NĐ 126/2020 sửa đổi bởi NĐ 91/2022)'
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
  'Lưu ý: kể từ 01/01/2026 áp dụng Luật Công đoàn 50/2024/QH15 và Nghị định hướng dẫn'
];

const STEPS_BIENDONG_LAODONG = [
  'Tổng hợp danh sách lao động tăng/giảm phát sinh trong tháng',
  'Lập thông báo theo mẫu hiện hành (Mẫu số 29 TT 28/2015/TT-BLĐTBXH hoặc mẫu mới theo NĐ 352/2025/NĐ-CP)',
  'Nộp thông báo cho Trung tâm Dịch vụ việc làm nơi đặt trụ sở (qua Cổng DVC hoặc trực tiếp) trước ngày 03 tháng kế tiếp',
  'Lưu biên nhận, đối chiếu với hồ sơ BHXH',
  'Nếu giảm từ 50 lao động trở lên trong tháng: thông báo ngay trong vòng 03 ngày làm việc'
];

const STEPS_HOLIDAY = [
  'Thông báo lịch nghỉ lễ cho người lao động trước kỳ nghỉ',
  'Bố trí trực bảo vệ, đảm bảo an toàn tài sản và PCCC trong thời gian nghỉ',
  'Trả lương 300% nếu bố trí làm thêm ngày lễ theo Bộ luật Lao động',
  'Lên kế hoạch khôi phục hoạt động ngay sau kỳ nghỉ'
];

// ── Danh sách entries (title + deadline phải khớp CHÍNH XÁC với DB Prod) ───
const ENTRIES = [
  // ─── THÁNG 6/2026 ────────────────────────────────────────────────────────
  {
    title: 'Gia hạn Giấy phép hoạt động điện lực',
    deadline: '2026-06-01',
    steps: [
      'Rà soát hiệu lực Giấy phép hoạt động điện lực hiện hữu; nộp hồ sơ trước khi hết hạn ≥ 60 ngày',
      'Chuẩn bị hồ sơ: đơn đề nghị, báo cáo hoạt động kỳ trước, hồ sơ năng lực tài chính-kỹ thuật, danh sách người quản lý kỹ thuật',
      'Nộp tại Cục Điều tiết điện lực (Bộ Công Thương) hoặc Sở Công Thương theo phân cấp tại Điều 9 Nghị định 61/2025/NĐ-CP',
      'Theo dõi tiến độ thẩm định, bổ sung hồ sơ khi được yêu cầu',
      'Lưu Giấy phép đã cấp lại; cập nhật phạm vi, công suất vào hồ sơ pháp lý của đơn vị'
    ]
  },
  { title: 'Thông báo biến động lao động kỳ tháng 5/2026', deadline: '2026-06-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'Báo cáo tình hình sử dụng lao động 6 tháng đầu năm 2026',
    deadline: '2026-06-05',
    steps: [
      'Cập nhật danh sách lao động đến 30/6/2026 (bao gồm cả lao động đang thử việc, hợp đồng dưới 1 tháng)',
      'Lập báo cáo theo Mẫu 01/PLI (Phụ lục I Nghị định 145/2020/NĐ-CP, sửa đổi bởi NĐ 35/2022/NĐ-CP)',
      'Nộp qua Cổng dịch vụ công về việc làm cho Sở Nội vụ (sau hợp nhất Sở LĐ-TB&XH) trước 05/6',
      'Đồng thời gửi cơ quan BHXH cấp huyện nơi đặt trụ sở',
      'Lưu báo cáo và biên nhận điện tử'
    ]
  },
  {
    title: 'Báo cáo kết quả thực hiện công tác PCCC 6 tháng đầu năm',
    deadline: '2026-06-14',
    steps: [
      'Tập hợp hồ sơ kiểm tra, bảo trì hệ thống báo cháy/chữa cháy, lối thoát hiểm trong 6 tháng',
      'Đánh giá tình trạng phương tiện, lực lượng PCCC cơ sở, kết quả huấn luyện nghiệp vụ',
      'Lập báo cáo theo mẫu của Luật PCCC&CNCH 55/2024/QH15 và Nghị định 105/2025/NĐ-CP',
      'Gửi cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn',
      'Lưu bản sao tại cơ sở phục vụ hậu kiểm'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 5/2026', deadline: '2026-06-22', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 5/2026', deadline: '2026-06-22', steps: STEPS_TNCN_MONTHLY },
  {
    title: 'Nộp thuế xuất khẩu, nhập khẩu theo tờ khai hải quan',
    deadline: '2026-06-25',
    steps: [
      'Tính tổng số thuế phát sinh theo tờ khai: thuế XK, NK, GTGT khâu NK, TTĐB, bảo vệ môi trường (nếu có)',
      'Nộp tiền qua ngân hàng ủy nhiệm thu của Hải quan hoặc Cổng thanh toán điện tử của Tổng cục Hải quan (epayment.customs.gov.vn)',
      'Đối với DN ưu tiên/AEO: được ân hạn nộp thuế tối đa 90 ngày kể từ ngày đăng ký tờ khai',
      'Đối với hàng tiêu dùng/hàng kinh doanh: phải nộp ngay trước khi thông quan',
      'Lưu giấy nộp tiền (UNC, biên lai) cùng tờ khai hải quan trong hồ sơ kế toán'
    ]
  },
  {
    title: 'Kiểm tra, duy trì điều kiện an toàn PCCC (cơ sở thuộc diện quản lý)',
    deadline: '2026-06-30',
    steps: [
      'Xác định cơ sở có thuộc Phụ lục danh mục quản lý PCCC theo Nghị định 105/2025/NĐ-CP hay không',
      'Tự kiểm tra điều kiện an toàn PCCC định kỳ (hệ thống báo cháy, chữa cháy tự động/bán tự động, lối thoát nạn, đèn EXIT, bình chữa cháy)',
      'Khắc phục ngay tồn tại; lập sổ theo dõi kiểm tra, sửa chữa',
      'Tổ chức huấn luyện nghiệp vụ PCCC&CNCH cho người làm việc',
      'Sẵn sàng cho kiểm tra của cơ quan Cảnh sát PCCC&CNCH'
    ]
  },
  {
    title: 'Kiểm toán năng lượng định kỳ (3 năm/lần)',
    deadline: '2026-06-30',
    steps: [
      'Xác định cơ sở có thuộc danh mục cơ sở sử dụng năng lượng trọng điểm (theo Quyết định công bố hằng năm của Thủ tướng) hay không',
      'Ký hợp đồng với tổ chức kiểm toán năng lượng đã đăng ký với Bộ Công Thương',
      'Tổ chức kiểm toán năng lượng theo chu kỳ 03 năm/lần (Điều 34 Luật Sử dụng năng lượng tiết kiệm và hiệu quả 50/2010/QH12)',
      'Lập báo cáo kiểm toán năng lượng; gửi Sở Công Thương trong vòng 30 ngày kể từ khi hoàn thành',
      'Lưu hồ sơ kiểm toán phục vụ thanh tra'
    ]
  },
  {
    title: 'Chứng chỉ hành nghề môi giới BĐS & hành nghề qua tổ chức/sàn',
    deadline: '2026-06-30',
    steps: [
      'Cá nhân môi giới phải có chứng chỉ hành nghề môi giới BĐS (kỳ thi sát hạch do Sở Xây dựng tổ chức)',
      'Cá nhân chỉ được hành nghề trong tổ chức kinh doanh dịch vụ môi giới hoặc sàn giao dịch BĐS (Điều 61-69 Luật KDBĐS 29/2023)',
      'Tổ chức/sàn quản lý danh sách môi giới đang hành nghề và cập nhật khi có biến động',
      'Theo dõi hiệu lực chứng chỉ; dự thi cấp lại theo quy định',
      'Lưu hồ sơ và sẵn sàng kiểm tra của Sở Xây dựng'
    ]
  },
  {
    title: 'An toàn PCCC & an ninh trật tự cơ sở lưu trú',
    deadline: '2026-06-30',
    steps: [
      'Duy trì điều kiện ANTT theo Nghị định 96/2016/NĐ-CP: cam kết ANTT, sổ đăng ký khách lưu trú, camera giám sát',
      'Đăng ký lưu trú cho khách qua hệ thống quản lý cư trú của Bộ Công an (Phần mềm khai báo tạm trú)',
      'Duy trì điều kiện PCCC: bình chữa cháy, lối thoát nạn, đèn EXIT, kế hoạch chữa cháy',
      'Kiểm tra định kỳ và lưu biên bản; báo cáo Công an phường/xã khi được yêu cầu',
      'Tập huấn nghiệp vụ ANTT, PCCC cho nhân viên'
    ]
  },
  {
    title: 'Kiểm tra an toàn PCCC điểm bán định kỳ',
    deadline: '2026-06-30',
    steps: [
      'Lập kế hoạch kiểm tra PCCC theo quý đối với từng điểm bán',
      'Kiểm tra bình chữa cháy (hạn sử dụng, áp lực), hệ thống báo cháy, đèn EXIT, lối thoát hiểm',
      'Khắc phục ngay nguy cơ phát hiện (chặn lối thoát, dây điện hở, gas/hóa chất dễ cháy)',
      'Lưu biên bản tự kiểm tra tại điểm bán',
      'Báo cáo tổng hợp cho lãnh đạo công ty và lưu hồ sơ chung'
    ]
  },
  {
    title: 'GCN đủ điều kiện kinh doanh dược & tái đánh giá GPP/GDP',
    deadline: '2026-06-30',
    steps: [
      'Rà soát ngày cấp Giấy chứng nhận đủ điều kiện kinh doanh dược',
      'Tái đánh giá duy trì đáp ứng GPP (Thực hành tốt cơ sở bán lẻ thuốc — TT 02/2018/TT-BYT) hoặc GDP (bán buôn — TT 03/2018/TT-BYT) định kỳ 03 năm/lần',
      'Nộp hồ sơ tại Sở Y tế (cơ sở bán lẻ) hoặc Cục Quản lý Dược (cơ sở bán buôn, sản xuất)',
      'Cập nhật danh sách dược sĩ phụ trách chuyên môn, danh mục thuốc, thiết bị bảo quản (nhiệt độ, độ ẩm)',
      'Tiếp đoàn đánh giá; nhận kết quả duy trì và lưu hồ sơ'
    ]
  },
  {
    title: 'Công khai điều kiện bảo đảm & cam kết chất lượng giáo dục',
    deadline: '2026-06-30',
    steps: [
      'Lập báo cáo tự đánh giá điều kiện bảo đảm chất lượng: cơ sở vật chất, đội ngũ giáo viên, chương trình, học liệu',
      'Công khai trên website cơ sở giáo dục theo Quy chế công khai (Thông tư của Bộ GDĐT)',
      'Niêm yết tại trụ sở các thông tin: thu-chi, chất lượng giáo dục, đội ngũ',
      'Gửi báo cáo cho Sở/Phòng GDĐT theo hướng dẫn',
      'Lưu hồ sơ và cập nhật khi có thay đổi'
    ]
  },
  {
    title: 'Kiểm tra, bảo đảm an toàn PCCC cơ sở giáo dục',
    deadline: '2026-06-30',
    steps: [
      'Kiểm tra hoạt động hệ thống báo cháy, chữa cháy tự động/bán tự động, lối thoát nạn',
      'Tổ chức diễn tập PCCC&CNCH định kỳ cho cán bộ, giáo viên, học sinh (ít nhất 01 lần/năm)',
      'Ký hợp đồng bảo trì hệ thống PCCC với đơn vị đủ điều kiện theo Nghị định 105/2025/NĐ-CP',
      'Lưu hồ sơ kiểm tra, biên bản diễn tập',
      'Báo cáo Sở/Phòng GDĐT và cơ quan Cảnh sát PCCC&CNCH khi được yêu cầu'
    ]
  },
  {
    title: 'Xin cấp/khai báo C/O (Giấy chứng nhận xuất xứ hàng hóa)',
    deadline: '2026-06-30',
    steps: [
      'Xác định mẫu C/O phù hợp với FTA muốn hưởng ưu đãi (Form D — ATIGA, Form E — ACFTA, Form AK — AKFTA, Form VK, Form EUR.1 — EVFTA, Form CPTPP, Form RCEP...)',
      'Đăng ký hồ sơ thương nhân trên Hệ thống eCoSys (ecosys.gov.vn) và VCCI',
      'Nộp hồ sơ kèm chứng từ: tờ khai HQ xuất khẩu, hóa đơn, bill, bảng kê NL, quy trình sản xuất, định mức NL',
      'Đối với DN đủ điều kiện: tự chứng nhận xuất xứ (REX với EVFTA, Self-cert với CPTPP)',
      'Lưu C/O bản gốc và toàn bộ hồ sơ chứng minh xuất xứ trong tối thiểu 5 năm'
    ]
  },
  {
    title: 'Thẩm duyệt/nghiệm thu an toàn PCCC công trình',
    deadline: '2026-06-30',
    steps: [
      'Xác định công trình có thuộc danh mục phải thẩm duyệt PCCC tại Luật PCCC&CNCH 55/2024 và Nghị định 105/2025/NĐ-CP hay không',
      'Lập hồ sơ thiết kế PCCC (thuyết minh, bản vẽ hệ thống chữa cháy, báo cháy, thoát nạn)',
      'Nộp hồ sơ thẩm duyệt tại Phòng Cảnh sát PCCC&CNCH cấp tỉnh hoặc Cục Cảnh sát PCCC&CNCH (theo phân cấp)',
      'Tổ chức nghiệm thu PCCC trước khi đưa công trình vào sử dụng',
      'Lưu Giấy chứng nhận thẩm duyệt và biên bản nghiệm thu PCCC trong hồ sơ hoàn công'
    ]
  },
  {
    title: 'Kiểm tra, bảo trì hệ thống PCCC định kỳ (cơ sở F&B)',
    deadline: '2026-06-30',
    steps: [
      'Kiểm tra bình chữa cháy (hạn, áp lực), hệ thống báo cháy, lối thoát nạn, đèn EXIT, bếp gas/điện',
      'Lập kế hoạch bảo trì hệ thống báo cháy/chữa cháy tự động theo tài liệu kỹ thuật của nhà sản xuất',
      'Ký hợp đồng bảo trì với đơn vị có Giấy xác nhận đủ điều kiện kinh doanh dịch vụ PCCC',
      'Lưu hồ sơ bảo trì, biên bản kiểm tra, chứng từ kiểm định bình chữa cháy',
      'Báo cáo cơ quan Cảnh sát PCCC&CNCH khi được yêu cầu'
    ]
  },
  {
    title: 'Gia hạn Giấy chứng nhận cơ sở đủ điều kiện ATTP',
    deadline: '2026-06-30',
    steps: [
      'Rà soát ngày cấp Giấy chứng nhận; nộp hồ sơ cấp lại trước khi hết hạn ≥ 06 tháng (Điều 12 Nghị định 15/2018/NĐ-CP)',
      'Chuẩn bị hồ sơ: đơn đề nghị, bản thuyết minh cơ sở vật chất, GCN khám sức khỏe nhân viên, GCN tập huấn kiến thức ATTP',
      'Nộp tại cơ quan có thẩm quyền theo ngành hàng: Sở Y tế (thực phẩm chức năng, nước uống), Sở Công Thương (rượu, bia, nước giải khát), Sở NN&PTNT (nông sản, thủy sản)',
      'Tiếp đoàn thẩm định cơ sở thực tế; khắc phục yêu cầu (nếu có)',
      'Nhận GCN mới (hiệu lực 03 năm) và lưu hồ sơ'
    ]
  },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 5/2026', deadline: '2026-06-30', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 6/2026', deadline: '2026-06-30', steps: STEPS_BHXH_MONTHLY },

  // ─── THÁNG 7/2026 ────────────────────────────────────────────────────────
  {
    title: 'Giấy phép bán lẻ hàng hóa có điều kiện (rượu, thuốc lá...)',
    deadline: '2026-07-01',
    steps: [
      'Rà soát hiệu lực Giấy phép bán lẻ rượu/thuốc lá tại từng địa điểm kinh doanh',
      'Chuẩn bị hồ sơ cấp/cấp lại: đơn đề nghị, bản sao GCN ĐKKD, hợp đồng thuê địa điểm, văn bản giới thiệu của thương nhân cung cấp',
      'Nộp tại UBND cấp huyện (rượu — Nghị định 105/2017/NĐ-CP, sửa đổi NĐ 17/2020/NĐ-CP) hoặc Sở Công Thương (thuốc lá — Nghị định 67/2013/NĐ-CP, sửa đổi NĐ 106/2017/NĐ-CP)',
      'Đóng lệ phí, nhận Giấy phép (thường có hiệu lực 05 năm với rượu, 03 năm với thuốc lá)',
      'Treo Giấy phép tại địa điểm bán; cập nhật khi có thay đổi'
    ]
  },
  {
    title: 'Gia hạn thẻ hướng dẫn viên du lịch (5 năm)',
    deadline: '2026-07-01',
    steps: [
      'Rà soát ngày cấp thẻ; nộp hồ sơ gia hạn trước khi hết hạn ≥ 30 ngày (Điều 60 Luật Du lịch 09/2017/QH14)',
      'Chuẩn bị: đơn đề nghị, ảnh, GCN khám sức khỏe, GCN bồi dưỡng nghiệp vụ HDV (cập nhật 03 năm/lần)',
      'Nộp tại Sở Du lịch hoặc Sở VHTTDL nơi đã cấp thẻ',
      'Đóng phí theo Thông tư của Bộ Tài chính',
      'Nhận thẻ mới (hiệu lực 05 năm); cập nhật vào hồ sơ hành nghề'
    ]
  },
  {
    title: 'Duy trì điều kiện Giấy phép kinh doanh dịch vụ lữ hành',
    deadline: '2026-07-01',
    steps: [
      'Kiểm tra điều kiện về ký quỹ kinh doanh dịch vụ lữ hành tại ngân hàng (Điều 31 Luật Du lịch 09/2017): nội địa 100tr, quốc tế inbound 250tr, quốc tế outbound 500tr',
      'Người phụ trách kinh doanh lữ hành phải có bằng tốt nghiệp cao đẳng trở lên chuyên ngành lữ hành (hoặc CC nghiệp vụ điều hành lữ hành)',
      'Đối chiếu danh sách HDV trong hợp đồng tour với danh sách HDV có thẻ',
      'Cập nhật ký quỹ tại ngân hàng và sao y gửi cơ quan cấp phép khi thay đổi mức ký quỹ',
      'Lưu hồ sơ pháp lý và sẵn sàng thanh tra của Sở Du lịch/VHTTDL'
    ]
  },
  { title: 'Thông báo biến động lao động kỳ tháng 6/2026', deadline: '2026-07-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'Báo cáo y tế lao động 6 tháng đầu năm 2026',
    deadline: '2026-07-04',
    steps: [
      'Tổng hợp danh sách lao động được khám sức khỏe định kỳ trong 6 tháng đầu năm',
      'Cập nhật hồ sơ khám phát hiện bệnh nghề nghiệp (nếu có)',
      'Lập báo cáo theo Phụ lục 8 Thông tư 19/2016/TT-BYT',
      'Gửi Trung tâm Kiểm soát bệnh tật (CDC) cấp tỉnh và Sở Y tế trước 05/7',
      'Lưu hồ sơ vệ sinh lao động và sức khỏe người lao động'
    ]
  },
  {
    title: 'Báo cáo tổng hợp tình hình tai nạn lao động 6 tháng đầu năm 2026',
    deadline: '2026-07-04',
    steps: [
      'Tập hợp biên bản điều tra tai nạn lao động (TNLĐ) phát sinh trong 6 tháng',
      'Phân loại theo mức độ: nhẹ, nặng, chết người',
      'Lập báo cáo theo Phụ lục XII Nghị định 39/2016/NĐ-CP',
      'Gửi Sở Lao động (sau hợp nhất: Sở Nội vụ) trước ngày 05/7 qua Cổng dịch vụ công',
      'Lưu bản chính tại doanh nghiệp'
    ]
  },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý II/2026',
    deadline: '2026-07-09',
    steps: [
      'Cập nhật tiến độ thực hiện dự án và giải ngân vốn đầu tư trong quý II',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT (hoặc văn bản thay thế)',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư (https://fdi.gov.vn cho FDI; https://dautucong.mpi.gov.vn cho đầu tư công)',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  {
    title: 'Công bố tình hình tai nạn lao động 6 tháng đầu năm 2026',
    deadline: '2026-07-09',
    steps: [
      'Tổng hợp số liệu TNLĐ tại cơ sở trong 6 tháng',
      'Niêm yết công khai tại trụ sở và nơi làm việc theo Điểm a khoản 1 Điều 4 Thông tư 13/2020/TT-BLĐTBXH',
      'Gửi báo cáo công bố cho Sở Lao động (Sở Nội vụ sau hợp nhất)',
      'Lưu bản công bố và biên bản niêm yết'
    ]
  },
  {
    title: 'Báo cáo giám sát, đánh giá đầu tư 6 tháng đầu năm 2026',
    deadline: '2026-07-09',
    steps: [
      'Tổng hợp tiến độ thực hiện và tình hình chấp hành pháp luật về đầu tư',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT (giám sát, đánh giá đầu tư)',
      'Gửi cơ quan đăng ký đầu tư qua Hệ thống thông tin quốc gia về đầu tư',
      'Lưu báo cáo và minh chứng kèm theo'
    ]
  },
  {
    title: 'Báo cáo kết quả triển khai Tháng hành động ATVSLĐ năm 2026',
    deadline: '2026-07-14',
    steps: [
      'Tổng hợp kết quả các hoạt động Tháng hành động ATVSLĐ tại cơ sở (tuyên truyền, huấn luyện, khám sức khỏe, kiểm tra)',
      'Lập báo cáo theo hướng dẫn hằng năm của Bộ Lao động (Cục An toàn lao động)',
      'Gửi Sở Lao động (Sở Nội vụ sau hợp nhất) qua Cổng dịch vụ công',
      'Lưu hồ sơ tài liệu, hình ảnh kèm theo'
    ]
  },
  {
    title: 'Kiểm định kỹ thuật an toàn máy, thiết bị nghiêm ngặt',
    deadline: '2026-07-15',
    steps: [
      'Lập danh mục máy, thiết bị có yêu cầu nghiêm ngặt về ATLĐ tại cơ sở (Thông tư 36/2019/TT-BLĐTBXH: nồi hơi, bình áp lực, thang máy, cần trục, vận thăng…)',
      'Ký hợp đồng với tổ chức kiểm định kỹ thuật ATLĐ đã được Cục An toàn lao động cấp Giấy chứng nhận',
      'Tổ chức kiểm định lần đầu trước khi đưa vào sử dụng và kiểm định định kỳ trước khi hết hiệu lực',
      'Dán tem kiểm định, lưu Giấy chứng nhận kết quả kiểm định',
      'Khai báo thiết bị có yêu cầu nghiêm ngặt về ATLĐ với Sở Lao động khi đưa vào sử dụng'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 6/2026', deadline: '2026-07-20', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 6/2026', deadline: '2026-07-20', steps: STEPS_TNCN_MONTHLY },
  { title: 'Tạm nộp thuế TNDN quý 2/2026', deadline: '2026-07-30', steps: STEPS_TNDN_PROVISIONAL },
  { title: 'Khai thuế GTGT quý 2/2026', deadline: '2026-07-31', steps: STEPS_GTGT_QUARTERLY },
  { title: 'Khai thuế TNCN khấu trừ quý 2/2026', deadline: '2026-07-31', steps: STEPS_TNCN_QUARTERLY },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 6/2026', deadline: '2026-07-31', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 7/2026', deadline: '2026-07-31', steps: STEPS_BHXH_MONTHLY },

  // ─── THÁNG 8/2026 ────────────────────────────────────────────────────────
  {
    title: 'Giấy phép/điều kiện nhập khẩu hàng quản lý điều kiện',
    deadline: '2026-08-01',
    steps: [
      'Tra cứu Danh mục hàng quản lý chuyên ngành tại Phụ lục các Bộ (theo Nghị định 69/2018/NĐ-CP và quy định riêng)',
      'Xin giấy phép/đăng ký điều kiện nhập khẩu trước khi mở tờ khai (Bộ Công Thương, Y tế, NN&PTNT, KHCN, TT&TT… tùy mặt hàng)',
      'Đối với hàng phải công bố/đăng ký lưu hành: hoàn thành thủ tục trước khi nhập (ví dụ TBYT, TPCN, mỹ phẩm, thức ăn chăn nuôi)',
      'Khai bổ sung số/ngày giấy phép trên tờ khai hải quan; xuất trình bản giấy/điện tử khi yêu cầu',
      'Lưu hồ sơ giấy phép kèm bộ chứng từ NK trong tối thiểu 05 năm phục vụ hậu kiểm'
    ]
  },
  { title: 'Thông báo biến động lao động kỳ tháng 7/2026', deadline: '2026-08-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'Duy trì điều kiện & cho phép hoạt động giáo dục',
    deadline: '2026-08-15',
    steps: [
      'Rà soát điều kiện về đội ngũ giáo viên, chương trình đào tạo, cơ sở vật chất theo Nghị định 125/2024/NĐ-CP',
      'Cập nhật Quyết định cho phép hoạt động giáo dục khi có thay đổi (địa điểm, ngành nghề, quy mô)',
      'Lập báo cáo định kỳ gửi Sở Giáo dục và Đào tạo',
      'Lưu hồ sơ pháp lý: quyết định thành lập, quyết định cho phép hoạt động, giấy phép xây dựng (nếu có)',
      'Sẵn sàng cho thanh tra, kiểm tra của cơ quan quản lý giáo dục'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 7/2026', deadline: '2026-08-20', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 7/2026', deadline: '2026-08-20', steps: STEPS_TNCN_MONTHLY },
  {
    title: 'Cung cấp thông tin Tổng điều tra kinh tế năm 2026',
    deadline: '2026-08-31',
    steps: [
      'Truy cập Trang Tổng điều tra kinh tế 2026 (https://tdtkt.gso.gov.vn) bằng tài khoản DN do cơ quan thống kê cấp',
      'Hoàn tất phiếu điều tra điện tử: thông tin chung, lao động & thu nhập, kết quả sản xuất kinh doanh, tài sản & nguồn vốn, sản phẩm chủ yếu',
      'Đối chiếu số liệu với báo cáo tài chính, báo cáo thuế trước khi gửi',
      'Hoàn tất kê khai trước 31/8/2026 (giai đoạn thu thập khối DN: 01/4 - 31/8/2026 theo Quyết định 2837/QĐ-BTC)',
      'Lưu mã phiếu và xác nhận hoàn thành'
    ]
  },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 7/2026', deadline: '2026-08-31', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 8/2026', deadline: '2026-08-31', steps: STEPS_BHXH_MONTHLY },

  // ─── THÁNG 9/2026 ────────────────────────────────────────────────────────
  {
    title: 'Gia hạn văn bằng bảo hộ nhãn hiệu (nếu đã đăng ký)',
    deadline: '2026-09-01',
    steps: [
      'Rà soát hiệu lực 10 năm của Giấy chứng nhận đăng ký nhãn hiệu (Điều 94 Luật SHTT 50/2005, sửa đổi)',
      'Nộp đơn yêu cầu gia hạn trong vòng 06 tháng trước ngày hết hạn (hoặc trong 06 tháng sau, kèm phí phạt)',
      'Nộp lệ phí gia hạn tại Cục Sở hữu trí tuệ (qua DVC4 hoặc trực tiếp tại VPDD HCM/Đà Nẵng)',
      'Theo dõi Quyết định ghi nhận gia hạn',
      'Cập nhật hiệu lực vào hồ sơ pháp lý của doanh nghiệp'
    ]
  },
  {
    title: 'Đăng ký / gia hạn quyền tác giả phần mềm',
    deadline: '2026-09-01',
    steps: [
      'Chuẩn bị hồ sơ: tờ khai, 02 bản in mã nguồn (hoặc đĩa CD), quyết định giao nhiệm vụ (nếu là sản phẩm nội bộ), cam kết tác giả',
      'Nộp tại Cục Bản quyền tác giả (Bộ VHTTDL) hoặc Văn phòng đại diện tại HCM, Đà Nẵng',
      'Có thể nộp trực tuyến qua Cổng dịch vụ công của Bộ VHTTDL',
      'Đóng phí thẩm định và cấp Giấy chứng nhận quyền tác giả',
      'Lưu giấy chứng nhận trong hồ sơ tài sản trí tuệ'
    ]
  },
  {
    title: 'Gia hạn Chứng chỉ năng lực hoạt động xây dựng (tổ chức)',
    deadline: '2026-09-01',
    steps: [
      'Rà soát hiệu lực CC năng lực hoạt động xây dựng (10 năm — Điều 83 Luật Xây dựng 50/2014, sửa đổi 62/2020)',
      'Cập nhật danh sách cá nhân chủ chốt có chứng chỉ hành nghề tương ứng với hạng đăng ký',
      'Nộp hồ sơ điện tử qua Cổng dịch vụ công Bộ Xây dựng (hoặc Sở Xây dựng theo phân cấp với hạng II, III)',
      'Đóng phí thẩm định; theo dõi kết quả thẩm định',
      'Cập nhật CCNL mới và đăng tải trên website Bộ Xây dựng'
    ]
  },
  {
    title: 'Giấy phép dịch vụ mạng xã hội/trang TTĐT/trò chơi điện tử',
    deadline: '2026-09-01',
    steps: [
      'Xác định loại dịch vụ và cơ quan thẩm quyền cấp phép theo Nghị định 147/2024/NĐ-CP: MXH, trang TTĐT tổng hợp, trò chơi điện tử G1/G2/G3/G4',
      'Chuẩn bị hồ sơ: đề án hoạt động, năng lực kỹ thuật-tài chính-nhân sự, phương án bảo đảm an toàn thông tin và xử lý nội dung vi phạm',
      'Nộp tại Cục PTTH&TTĐT (Bộ TT&TT — nay là Bộ KH&CN sau hợp nhất) hoặc Sở TT&TT theo phân cấp',
      'Hoàn tất nghĩa vụ pháp lý liên quan: định danh tài khoản người dùng, hợp đồng với đơn vị xác thực điện tử',
      'Lưu giấy phép và báo cáo định kỳ về số liệu dịch vụ'
    ]
  },
  { title: '🇻🇳 Nghỉ lễ Quốc khánh 2/9 (Ngày 1/2)', deadline: '2026-09-02', steps: STEPS_HOLIDAY },
  { title: '🇻🇳 Nghỉ lễ Quốc khánh 3/9 (Ngày 2/2)', deadline: '2026-09-03', steps: STEPS_HOLIDAY },
  { title: 'Thông báo biến động lao động kỳ tháng 8/2026', deadline: '2026-09-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'An toàn thực phẩm bếp ăn bán trú',
    deadline: '2026-09-15',
    steps: [
      'Lựa chọn đơn vị cung cấp suất ăn có GCN cơ sở đủ điều kiện ATTP (hoặc tự tổ chức bếp ăn có GCN ATTP)',
      'Thực hiện kiểm thực 3 bước và lưu mẫu thức ăn 24 giờ theo Quyết định 1246/QĐ-BYT (hoặc văn bản thay thế)',
      'Khám sức khỏe định kỳ 6 tháng/lần cho nhân viên bếp; tập huấn kiến thức ATTP',
      'Lưu hồ sơ truy xuất nguồn gốc nguyên liệu',
      'Phối hợp với phụ huynh, công khai thực đơn và minh bạch quy trình'
    ]
  },
  {
    title: 'Báo cáo định kỳ với cơ quan quản lý giáo dục',
    deadline: '2026-09-15',
    steps: [
      'Tổng hợp dữ liệu hoạt động giáo dục theo kỳ (đầu năm học, học kỳ, năm học) theo Quy chế của Bộ GDĐT',
      'Lập báo cáo theo biểu mẫu hướng dẫn của Sở/Phòng GDĐT',
      'Gửi báo cáo qua hệ thống cơ sở dữ liệu ngành giáo dục (https://csdl.moet.gov.vn) hoặc theo hướng dẫn của Sở',
      'Lưu bản sao báo cáo và biên nhận'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 8/2026', deadline: '2026-09-21', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 8/2026', deadline: '2026-09-21', steps: STEPS_TNCN_MONTHLY },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 8/2026', deadline: '2026-09-30', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 9/2026', deadline: '2026-09-30', steps: STEPS_BHXH_MONTHLY },

  // ─── THÁNG 10/2026 ───────────────────────────────────────────────────────
  {
    title: 'Giấy phép hoạt động sàn giao dịch BĐS & cập nhật khi thay đổi',
    deadline: '2026-10-01',
    steps: [
      'Rà soát điều kiện sàn theo Điều 55–58 Luật KDBĐS 29/2023/QH15 và Nghị định 96/2024/NĐ-CP',
      'Cập nhật danh sách môi giới đang hành nghề tại sàn (mỗi sàn ≥ 02 môi giới có CCHN)',
      'Báo cáo định kỳ giao dịch qua sàn cho Sở Xây dựng theo Mẫu của NĐ 96/2024',
      'Cập nhật thông tin lên Hệ thống thông tin về nhà ở và thị trường BĐS quốc gia',
      'Cập nhật Giấy phép khi thay đổi: tên sàn, địa điểm, người đại diện, môi giới'
    ]
  },
  {
    title: 'Công nhận / duy trì hạng sao cơ sở lưu trú du lịch',
    deadline: '2026-10-01',
    steps: [
      'Rà soát điều kiện cơ sở vật chất, dịch vụ, nhân lực theo TCVN xếp hạng (4391:2015 — khách sạn, 7795:2009 — biệt thự nghỉ dưỡng…)',
      'Lập hồ sơ tự xếp hạng/công nhận hạng theo Điều 50 Luật Du lịch 09/2017/QH14',
      'Nộp tại Sở Du lịch (Tổng cục Du lịch với hạng 4-5 sao) hoặc Sở VHTTDL nơi cơ sở hoạt động',
      'Tiếp đoàn thẩm định; khắc phục yêu cầu (nếu có) trong thời hạn',
      'Treo bảng hạng sao đúng quy định; cập nhật khi có thay đổi hoặc tái thẩm định 5 năm/lần'
    ]
  },
  { title: 'Thông báo biến động lao động kỳ tháng 9/2026', deadline: '2026-10-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'Báo cáo tình hình thực hiện dự án đầu tư Quý III/2026',
    deadline: '2026-10-09',
    steps: [
      'Cập nhật tiến độ thực hiện dự án và giải ngân vốn đầu tư trong quý III',
      'Lập báo cáo theo Mẫu A.III.1 Phụ lục III Thông tư 03/2021/TT-BKHĐT',
      'Báo cáo qua Hệ thống thông tin quốc gia về đầu tư (https://fdi.gov.vn)',
      'Gửi cho Sở Tài chính/cơ quan đăng ký đầu tư',
      'Lưu báo cáo phục vụ thanh-kiểm tra'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 9/2026', deadline: '2026-10-20', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 9/2026', deadline: '2026-10-20', steps: STEPS_TNCN_MONTHLY },
  { title: 'Tạm nộp thuế TNDN quý 3/2026', deadline: '2026-10-30', steps: STEPS_TNDN_PROVISIONAL },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 9/2026', deadline: '2026-10-31', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 10/2026', deadline: '2026-10-31', steps: STEPS_BHXH_MONTHLY },

  // ─── THÁNG 11/2026 ───────────────────────────────────────────────────────
  {
    title: 'Duy trì điều kiện & Giấy phép thành lập, hoạt động (TCTD)',
    deadline: '2026-11-01',
    steps: [
      'Rà soát điều kiện về vốn pháp định, tỷ lệ an toàn vốn (CAR) theo Luật Các tổ chức tín dụng 32/2024/QH15',
      'Cập nhật cơ cấu cổ đông, người quản lý, người điều hành khi có thay đổi',
      'Báo cáo NHNN khi có thay đổi cổ đông sở hữu từ 1% vốn điều lệ trở lên',
      'Thực hiện kiểm toán độc lập hằng năm; công bố báo cáo tài chính đã kiểm toán',
      'Cập nhật Giấy phép thành lập & hoạt động khi thay đổi nội dung'
    ]
  },
  { title: 'Khai thuế GTGT quý 3/2026', deadline: '2026-11-02', steps: STEPS_GTGT_QUARTERLY },
  { title: 'Khai thuế TNCN khấu trừ quý 3/2026', deadline: '2026-11-02', steps: STEPS_TNCN_QUARTERLY },
  { title: 'Thông báo biến động lao động kỳ tháng 10/2026', deadline: '2026-11-03', steps: STEPS_BIENDONG_LAODONG },
  { title: 'Khai thuế GTGT kỳ tháng 10/2026', deadline: '2026-11-20', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 10/2026', deadline: '2026-11-20', steps: STEPS_TNCN_MONTHLY },
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 10/2026', deadline: '2026-11-30', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 11/2026', deadline: '2026-11-30', steps: STEPS_BHXH_MONTHLY },
  {
    title: 'Báo cáo kiểm soát và bảo đảm an toàn bức xạ năm 2026',
    deadline: '2026-11-30',
    steps: [
      'Cập nhật danh sách nguồn bức xạ, thiết bị bức xạ tại cơ sở (số seri, hoạt độ, tình trạng)',
      'Tổng hợp kết quả đo liều cá nhân, kiểm xạ định kỳ trong năm',
      'Lập báo cáo theo Phụ lục Thông tư 19/2012/TT-BKHCN',
      'Gửi Cục An toàn bức xạ và hạt nhân (Bộ KH&CN) và Sở KH&CN địa phương',
      'Lưu hồ sơ tại cơ sở phục vụ thanh tra'
    ]
  },
  {
    title: 'Báo cáo thực trạng an toàn tiến hành công việc bức xạ năm 2026',
    deadline: '2026-11-30',
    steps: [
      'Đánh giá việc chấp hành các điều kiện an toàn bức xạ tại cơ sở',
      'Tổng hợp số liệu đo liều cá nhân, kiểm xạ môi trường làm việc',
      'Lập báo cáo theo Khoản 1 Điều 20 Thông tư 19/2012/TT-BKHCN',
      'Gửi Cục An toàn bức xạ và hạt nhân và Sở KH&CN trước 30/11',
      'Lưu báo cáo và hồ sơ kết quả đo liều'
    ]
  },

  // ─── THÁNG 12/2026 ───────────────────────────────────────────────────────
  { title: 'Thông báo biến động lao động kỳ tháng 11/2026', deadline: '2026-12-03', steps: STEPS_BIENDONG_LAODONG },
  {
    title: 'Báo cáo tình hình sử dụng lao động cả năm 2026',
    deadline: '2026-12-05',
    steps: [
      'Cập nhật danh sách lao động đến 31/12/2026',
      'Lập báo cáo theo Mẫu 01/PLI (Phụ lục I Nghị định 145/2020/NĐ-CP, sửa đổi NĐ 35/2022/NĐ-CP)',
      'Nộp qua Cổng dịch vụ công về việc làm cho Sở Nội vụ (sau hợp nhất Sở LĐTBXH) trước 05/12',
      'Đồng thời gửi cơ quan BHXH cấp huyện nơi đặt trụ sở',
      'Lưu báo cáo và biên nhận điện tử'
    ]
  },
  {
    title: 'Báo cáo kết quả thực hiện công tác PCCC năm 2026',
    deadline: '2026-12-14',
    steps: [
      'Tổng hợp toàn bộ hoạt động PCCC cả năm: kiểm tra, bảo trì, huấn luyện, sự cố (nếu có)',
      'Đánh giá năng lực PCCC tại chỗ và tồn tại cần khắc phục năm sau',
      'Lập báo cáo theo mẫu của Luật PCCC&CNCH 55/2024/QH15 và Nghị định 105/2025/NĐ-CP',
      'Gửi cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn',
      'Lưu bản sao tại cơ sở'
    ]
  },
  {
    title: 'Báo cáo kết quả thực hiện công tác PCCC 6 tháng cuối năm 2026',
    deadline: '2026-12-14',
    steps: [
      'Tập hợp hồ sơ kiểm tra, bảo trì hệ thống PCCC trong 6 tháng cuối năm',
      'Đánh giá tình trạng phương tiện, lực lượng PCCC cơ sở',
      'Lập báo cáo theo mẫu của Luật PCCC&CNCH 55/2024/QH15 và Nghị định 105/2025/NĐ-CP',
      'Gửi cơ quan Cảnh sát PCCC&CNCH quản lý địa bàn',
      'Lưu bản sao tại cơ sở phục vụ hậu kiểm'
    ]
  },
  {
    title: 'Báo cáo kết quả đánh giá an toàn kỹ thuật công trình phát điện',
    deadline: '2026-12-14',
    steps: [
      'Tổng hợp kết quả kiểm tra, bảo dưỡng thiết bị phát điện trong năm (tua-bin, máy phát, hệ thống điều khiển)',
      'Đánh giá an toàn kỹ thuật theo Thông tư của Bộ Công Thương về an toàn công trình điện',
      'Lập báo cáo và gửi Sở Công Thương/Cục Điều tiết điện lực (theo phân cấp)',
      'Lưu hồ sơ kỹ thuật, biên bản kiểm tra'
    ]
  },
  { title: 'Khai thuế GTGT kỳ tháng 11/2026', deadline: '2026-12-21', steps: STEPS_GTGT_MONTHLY },
  { title: 'Khai thuế TNCN khấu trừ kỳ tháng 11/2026', deadline: '2026-12-21', steps: STEPS_TNCN_MONTHLY },
  {
    title: 'Báo cáo mức giảm phát thải khí nhà kính năm 2026',
    deadline: '2026-12-30',
    steps: [
      'Áp dụng cho cơ sở thuộc danh mục phải kiểm kê KNK (Quyết định 13/2024/QĐ-TTg và Quyết định cập nhật hằng năm)',
      'Đo đạc, tính toán lượng phát thải KNK theo phương pháp IPCC và hệ số phát thải của Việt Nam',
      'Lập báo cáo kết quả giảm phát thải KNK theo Mẫu của Nghị định 06/2022/NĐ-CP',
      'Nộp qua Hệ thống thông tin quốc gia về biến đổi khí hậu hoặc cho Bộ TN&MT',
      'Lưu chứng từ quan trắc, hệ số phát thải, dữ liệu hoạt động'
    ]
  },
  {
    title: 'Báo cáo công tác kiểm định kỹ thuật ATLĐ, huấn luyện ATVSLĐ năm 2026',
    deadline: '2026-12-30',
    steps: [
      'Tổng hợp số máy, thiết bị có yêu cầu nghiêm ngặt về ATLĐ đã được kiểm định trong năm',
      'Tổng hợp số người được huấn luyện theo từng nhóm (1-6) theo Nghị định 44/2016/NĐ-CP',
      'Lập báo cáo theo Mẫu của NĐ 44/2016/NĐ-CP (đối với đơn vị cung cấp dịch vụ huấn luyện/kiểm định) hoặc báo cáo nội bộ của DN',
      'Gửi Sở Lao động (Sở Nội vụ sau hợp nhất) và Bộ Lao động khi được yêu cầu',
      'Lưu hồ sơ kiểm định, chứng chỉ huấn luyện cấp cho người lao động'
    ]
  },
  {
    title: 'Báo cáo thực hiện công tác quan trắc môi trường lao động năm 2026',
    deadline: '2026-12-30',
    steps: [
      'Tổng hợp kết quả quan trắc môi trường lao động (vi khí hậu, ánh sáng, tiếng ồn, bụi, hóa chất…) đã thực hiện trong năm',
      'So sánh với quy chuẩn kỹ thuật quốc gia về vệ sinh lao động (QCVN của Bộ Y tế)',
      'Lập báo cáo theo Nghị định 44/2016/NĐ-CP và Nghị định 39/2016/NĐ-CP',
      'Lưu hồ sơ vệ sinh lao động tại cơ sở; gửi Sở Y tế và Sở Lao động khi được yêu cầu',
      'Thực hiện các biện pháp khắc phục đối với chỉ tiêu vượt ngưỡng'
    ]
  },
  // ─── Sửa thiếu Lô 0 (bug filter ISO date — 4 event ngày 31/12 bị bỏ sót) ──
  { title: 'Đóng kinh phí công đoàn (KPCĐ) 2% kỳ tháng 11/2026', deadline: '2026-12-31', steps: STEPS_KPCD_MONTHLY },
  { title: 'Trích nộp BHXH, BHYT, BHTN kỳ tháng 12/2026', deadline: '2026-12-31', steps: STEPS_BHXH_MONTHLY },
  {
    title: 'Tham gia bồi dưỡng bắt buộc chuyên môn, nghiệp vụ luật sư',
    deadline: '2026-12-31',
    steps: [
      'Luật sư phải tham gia bồi dưỡng bắt buộc tối thiểu 08 giờ/năm theo Thông tư 02/2019/TT-BTP (sửa đổi)',
      'Đăng ký lớp tại Liên đoàn Luật sư Việt Nam (https://liendoanluatsu.org.vn) hoặc Đoàn Luật sư địa phương',
      'Hoàn thành các nội dung bồi dưỡng và đạt yêu cầu sát hạch (nếu có)',
      'Nhận Giấy chứng nhận hoàn thành; lưu vào hồ sơ hành nghề cá nhân',
      'Tổ chức hành nghề luật sư báo cáo tổng hợp với Đoàn Luật sư khi kết thúc năm'
    ]
  }
];

// ── Lô 1: INSERT các nghĩa vụ chung CÒN THIẾU trong 06-12/2026 ────────────
// Idempotent: NOT EXISTS guard theo (title, deadline). Mục nào đã có sẽ bỏ qua.
const NEW_INSERTS = [
  {
    title: 'Kê khai phí bảo vệ môi trường đối với nước thải Q2/2026',
    deadline: '2026-07-30',
    category: 'environment',
    scope: 'general',
    industry: null,
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Tổ chức, cá nhân xả nước thải công nghiệp thuộc đối tượng kê khai, nộp phí bảo vệ môi trường thực hiện kê khai số liệu xả thải quý 2 và nộp phí theo quy định.',
    legal_basis: 'Nghị định 53/2020/NĐ-CP về phí BVMT đối với nước thải (sửa đổi Nghị định 90/2023/NĐ-CP nếu có); hạn kê khai và nộp phí: chậm nhất ngày 30 của tháng đầu quý sau.',
    penalty: 'Chậm nộp phí: tính tiền chậm nộp; kê khai không đúng có thể bị truy thu và xử phạt hành chính theo Nghị định 45/2022/NĐ-CP về xử phạt vi phạm BVMT. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp khối lượng nước thải, kết quả quan trắc chất gây ô nhiễm (COD, TSS, Hg, Pb, As, Cd, Cr…) trong quý 2',
      'Tính phí cố định (4tr/năm chia 4 quý cho cơ sở có lưu lượng dưới ngưỡng) và phí biến đổi (theo từng chất ô nhiễm)',
      'Lập Tờ khai phí BVMT theo Mẫu của Nghị định 53/2020/NĐ-CP và nộp tại cơ quan thuế quản lý trực tiếp',
      'Nộp phí qua Cổng thanh toán điện tử của Tổng cục Thuế (chậm nhất 30/7)',
      'Lưu hồ sơ kê khai, chứng từ nộp phí và kết quả quan trắc'
    ]
  },
  {
    title: 'Kê khai phí bảo vệ môi trường đối với nước thải Q3/2026',
    deadline: '2026-10-30',
    category: 'environment',
    scope: 'general',
    industry: null,
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Tổ chức, cá nhân xả nước thải công nghiệp thuộc đối tượng kê khai, nộp phí bảo vệ môi trường thực hiện kê khai số liệu xả thải quý 3 và nộp phí theo quy định.',
    legal_basis: 'Nghị định 53/2020/NĐ-CP về phí BVMT đối với nước thải (sửa đổi nếu có); hạn kê khai và nộp phí: chậm nhất ngày 30 của tháng đầu quý sau.',
    penalty: 'Chậm nộp phí: tính tiền chậm nộp; kê khai không đúng có thể bị truy thu và xử phạt hành chính theo Nghị định 45/2022/NĐ-CP về xử phạt vi phạm BVMT. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp khối lượng nước thải, kết quả quan trắc chất gây ô nhiễm trong quý 3',
      'Tính phí cố định và phí biến đổi theo từng chất ô nhiễm',
      'Lập Tờ khai phí BVMT và nộp tại cơ quan thuế quản lý trực tiếp',
      'Nộp phí qua Cổng thanh toán điện tử của Tổng cục Thuế (chậm nhất 30/10)',
      'Lưu hồ sơ kê khai, chứng từ nộp phí và kết quả quan trắc'
    ]
  },
  {
    title: 'Công bố báo cáo tài chính giữa niên độ Q2/2026 (DN niêm yết, công ty đại chúng)',
    deadline: '2026-08-14',
    category: 'report',
    scope: 'general',
    industry: null,
    frequency: 'yearly',
    priority: 'high',
    description: 'Công ty đại chúng, doanh nghiệp niêm yết phải công bố báo cáo tài chính giữa niên độ (06 tháng) đã được soát xét trong vòng 45 ngày kể từ ngày kết thúc bán niên độ (30/6).',
    legal_basis: 'Thông tư 96/2020/TT-BTC về công bố thông tin trên TTCK; Điều 14 Thông tư 96/2020/TT-BTC (báo cáo tài chính bán niên đã soát xét trong 45 ngày). Áp dụng cho công ty đại chúng theo Điều 32 Luật Chứng khoán 54/2019/QH14.',
    penalty: 'Vi phạm nghĩa vụ công bố thông tin: phạt từ 50-150 triệu (cá nhân) hoặc cao hơn (tổ chức) theo Nghị định 156/2020/NĐ-CP (sửa đổi 128/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Khóa sổ kế toán đến 30/6/2026; rà soát các nghiệp vụ trọng yếu',
      'Bàn giao dự thảo báo cáo tài chính cho công ty kiểm toán độc lập để soát xét',
      'Hoàn thiện BCTC giữa niên độ kèm Báo cáo soát xét của kiểm toán',
      'Công bố thông tin trên website công ty và hệ thống công bố của UBCKNN/HOSE/HNX trong vòng 45 ngày sau kết thúc bán niên độ',
      'Lưu hồ sơ công bố và biên nhận điện tử'
    ]
  }
];

// ── Hash kỳ vọng để theo dõi thay đổi ──────────────────────────────────────
const EXPECTED_BACKFILL_COUNT = ENTRIES.length; // 92 sau khi thêm 3 mục 31/12

// ── Seed runner ────────────────────────────────────────────────────────────
let lastBackfillH2_2026Result = { status: 'not_run' };

async function seedBackfillStepsHalf2026(client, log) {
  // ── Phần 1: UPDATE-only backfill steps ────────────────────────────────────
  let updated = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyHas = 0;
  const errors = [];

  for (const e of ENTRIES) {
    try {
      const exists = await client.query(
        `SELECT id, (steps IS NULL OR steps::text='[]' OR steps::text='null') AS empty
         FROM events
         WHERE title = $1 AND deadline = $2::date
         LIMIT 1`,
        [e.title, e.deadline]
      );
      if (exists.rowCount === 0) {
        skippedNoMatch += 1;
        continue;
      }
      if (!exists.rows[0].empty) {
        skippedAlreadyHas += 1;
        continue;
      }
      await client.query(
        `UPDATE events
         SET steps = $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(e.steps), exists.rows[0].id]
      );
      updated += 1;
    } catch (err) {
      errors.push({ title: e.title, deadline: e.deadline, error: err.message });
      if (log) log('ERROR', 'Backfill H2 2026 step failed', { title: e.title, deadline: e.deadline, error: err.message });
    }
  }

  // ── Phần 2: INSERT các nghĩa vụ chung CÒN THIẾU (Lô 1) ────────────────────
  let inserted = 0;
  let skippedExisting = 0;
  const insertErrors = [];

  for (const ev of NEW_INSERTS) {
    try {
      const exists = await client.query(
        `SELECT 1 FROM events WHERE title = $1 AND deadline = $2::date LIMIT 1`,
        [ev.title, ev.deadline]
      );
      if (exists.rowCount > 0) {
        skippedExisting += 1;
        continue;
      }
      await client.query(
        `INSERT INTO events
           (title, description, category, deadline, frequency, legal_basis, penalty,
            applies_to, priority, reminder_days, scope, industry, steps, is_active)
         VALUES
           ($1, $2, $3, $4::date, $5, $6, $7,
            'business', $8, 7, $9, $10, $11::jsonb, true)`,
        [
          ev.title,
          ev.description || null,
          ev.category || 'other',
          ev.deadline,
          ev.frequency || null,
          ev.legal_basis || null,
          ev.penalty || null,
          ev.priority || 'medium',
          ev.scope || 'general',
          ev.industry || null,
          JSON.stringify(ev.steps || [])
        ]
      );
      inserted += 1;
    } catch (err) {
      insertErrors.push({ title: ev.title, deadline: ev.deadline, error: err.message });
      if (log) log('ERROR', 'New insert H2 2026 failed', { title: ev.title, deadline: ev.deadline, error: err.message });
    }
  }

  lastBackfillH2_2026Result = {
    status: 'ok',
    ran_at: new Date().toISOString(),
    backfill: {
      total_entries: ENTRIES.length,
      updated,
      skipped_no_match: skippedNoMatch,
      skipped_already_has_steps: skippedAlreadyHas,
      errors
    },
    inserts: {
      total_entries: NEW_INSERTS.length,
      inserted,
      skipped_existing: skippedExisting,
      errors: insertErrors
    }
  };
  if (log) log('INFO', 'Seed H2 2026 (backfill+inserts) completed', lastBackfillH2_2026Result);
  return lastBackfillH2_2026Result;
}

function getLastBackfillH2_2026Result() {
  return lastBackfillH2_2026Result;
}

module.exports = {
  seedBackfillStepsHalf2026,
  getLastBackfillH2_2026Result
};

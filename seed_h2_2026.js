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

// ── Lô 3: F&B (5) + Y tế (5) — chuyên ngành Pro 06-12/2026 ───────────────
const INDUSTRY_FNB_YTE = [
  // ─── F&B (industry='fnb') ──────────────────────────────────────────────
  {
    title: 'Khám sức khỏe định kỳ kỳ 2/2026 cho nhân viên trực tiếp chế biến TP',
    deadline: '2026-11-13',
    category: 'safety',
    scope: 'industry',
    industry: 'fnb',
    frequency: 'yearly',
    priority: 'high',
    description: 'Người trực tiếp sản xuất, chế biến, kinh doanh thực phẩm phải được khám sức khỏe định kỳ ít nhất 01 lần/năm; giấy khám sức khỏe có hiệu lực 12 tháng. Đợt khám đầu năm thường vào tháng 5; đợt khám cuối năm phục vụ gia hạn giấy khám sức khỏe sang năm 2027.',
    legal_basis: 'Điều 5 và Phụ lục 1 Thông tư 14/2013/TT-BYT về khám sức khỏe; Điều 36 Luật An toàn thực phẩm 55/2010/QH12; Điều 5 Nghị định 15/2018/NĐ-CP.',
    penalty: 'Sử dụng người không có giấy khám sức khỏe hoặc giấy đã hết hạn: phạt tiền 1-3 triệu đồng (cá nhân) hoặc gấp 2 lần (tổ chức) theo Điều 9 Nghị định 115/2018/NĐ-CP (sửa đổi Nghị định 124/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật danh sách nhân viên trực tiếp tiếp xúc thực phẩm cần khám sức khỏe',
      'Liên hệ cơ sở y tế đủ điều kiện theo Thông tư 14/2013/TT-BYT (Trung tâm Y tế cấp huyện trở lên)',
      'Tổ chức khám đầy đủ các nội dung: tổng quát, xét nghiệm phát hiện tả, lỵ, thương hàn, viêm gan A, E, lao, viêm da nhiễm khuẩn',
      'Lưu giấy khám sức khỏe (hiệu lực 12 tháng) vào hồ sơ pháp lý của cơ sở',
      'Bố trí nhân viên không đạt yêu cầu sang vị trí khác phù hợp'
    ]
  },
  {
    title: 'Tập huấn kiến thức ATTP đợt cuối năm 2026 cho nhân viên F&B',
    deadline: '2026-12-15',
    category: 'safety',
    scope: 'industry',
    industry: 'fnb',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Chủ cơ sở và người trực tiếp sản xuất, chế biến, kinh doanh thực phẩm phải được tập huấn và có giấy xác nhận kiến thức an toàn thực phẩm. Tổ chức tập huấn nội bộ hoặc thuê đơn vị đủ điều kiện trước khi kết thúc năm để chuẩn bị cho năm 2027.',
    legal_basis: 'Điều 36 Luật An toàn thực phẩm 55/2010/QH12; Điều 5 Nghị định 15/2018/NĐ-CP; văn bản hướng dẫn của Bộ Y tế/Bộ Công Thương/Bộ NN&PTNT theo từng ngành hàng.',
    penalty: 'Sử dụng người không có giấy xác nhận kiến thức ATTP: phạt tiền 1-3 triệu đồng (cá nhân) hoặc gấp 2 lần (tổ chức) theo Điều 9 Nghị định 115/2018/NĐ-CP (sửa đổi Nghị định 124/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh sách nhân viên cần tập huấn (chủ cơ sở, nhân viên chế biến, phục vụ trực tiếp)',
      'Tổ chức lớp tập huấn nội bộ theo tài liệu chuẩn của Bộ Y tế (hoặc thuê đơn vị đủ điều kiện)',
      'Tổ chức đánh giá, cấp giấy xác nhận kiến thức ATTP cho người đạt yêu cầu',
      'Lưu hồ sơ tập huấn (danh sách, bài giảng, bài thi, giấy xác nhận) tại cơ sở',
      'Cập nhật vào hồ sơ pháp lý của cơ sở phục vụ kiểm tra'
    ]
  },
  {
    title: 'Đăng ký bản công bố sản phẩm thực phẩm (TPCN, TP đặc biệt, TP cho trẻ <36 tháng)',
    deadline: '2026-09-15',
    category: 'license',
    scope: 'industry',
    industry: 'fnb',
    frequency: 'once',
    priority: 'high',
    description: 'Tổ chức, cá nhân sản xuất, kinh doanh thực phẩm bảo vệ sức khỏe (TPCN), thực phẩm dinh dưỡng y học, thực phẩm dùng cho chế độ ăn đặc biệt và sản phẩm dinh dưỡng cho trẻ đến 36 tháng tuổi phải đăng ký bản công bố sản phẩm trước khi đưa ra thị trường. Mốc trong app là minh hoạ — thực hiện trước mỗi lần ra sản phẩm mới hoặc thay đổi công thức.',
    legal_basis: 'Điều 6, 7, 8 Nghị định 15/2018/NĐ-CP về thi hành Luật ATTP; Thông tư 43/2014/TT-BYT về quản lý thực phẩm chức năng (và các văn bản thay thế).',
    penalty: 'Kinh doanh sản phẩm thuộc diện phải đăng ký công bố mà không thực hiện: phạt từ 50-100 triệu (tổ chức) theo Điều 22 Nghị định 115/2018/NĐ-CP (sửa đổi Nghị định 124/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Chuẩn bị hồ sơ: bản công bố sản phẩm, phiếu kết quả kiểm nghiệm trong 12 tháng, mẫu nhãn, tài liệu khoa học chứng minh công dụng (đối với TPCN)',
      'Nộp hồ sơ trực tuyến tại Cục An toàn thực phẩm (Bộ Y tế) qua hệ thống VFA (https://congbosanpham.vfa.gov.vn) — với TPCN, TP đặc biệt, TP cho trẻ <36 tháng',
      'Nộp tại Sở Y tế/Sở Công Thương/Sở NN&PTNT với các loại thực phẩm khác (tùy phân cấp)',
      'Theo dõi tình trạng thẩm định và nhận Giấy tiếp nhận đăng ký bản công bố sản phẩm',
      'Sản phẩm chỉ được lưu hành sau khi có Giấy tiếp nhận; lưu hồ sơ trong tối thiểu 02 năm sau khi hết hạn sản phẩm'
    ]
  },
  {
    title: 'Tự công bố sản phẩm thực phẩm thường (đối với SP mới hoặc thay đổi)',
    deadline: '2026-10-15',
    category: 'license',
    scope: 'industry',
    industry: 'fnb',
    frequency: 'once',
    priority: 'medium',
    description: 'Tổ chức, cá nhân sản xuất, kinh doanh thực phẩm đã qua chế biến bao gói sẵn, phụ gia thực phẩm, chất hỗ trợ chế biến TP, dụng cụ chứa đựng TP, bao bì TP… thực hiện tự công bố sản phẩm. Đây là thủ tục đơn giản hơn đăng ký bản công bố, áp dụng cho phần lớn sản phẩm thực phẩm thông thường.',
    legal_basis: 'Điều 4, 5 Nghị định 15/2018/NĐ-CP; sửa đổi bởi Nghị định 124/2021/NĐ-CP.',
    penalty: 'Không thực hiện tự công bố hoặc tự công bố không đúng: phạt từ 20-50 triệu đồng (tổ chức) theo Điều 20 Nghị định 115/2018/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Chuẩn bị hồ sơ: bản tự công bố sản phẩm (Mẫu 01 Phụ lục I NĐ 15/2018), kết quả kiểm nghiệm trong 12 tháng',
      'Niêm yết hồ sơ tự công bố trên trang thông tin điện tử của doanh nghiệp (nếu có) hoặc công khai tại trụ sở',
      'Nộp bản tự công bố cho cơ quan quản lý nhà nước có thẩm quyền (Sở Y tế/Sở Công Thương/Sở NN&PTNT) hoặc qua Cổng DVC',
      'Sản phẩm được phép lưu thông ngay sau khi tự công bố và lưu hồ sơ',
      'Lưu hồ sơ kiểm nghiệm định kỳ (tối thiểu 12 tháng/lần) cho mỗi sản phẩm'
    ]
  },
  {
    title: 'Báo cáo định kỳ kết quả kiểm nghiệm sản phẩm (cơ sở SX thực phẩm)',
    deadline: '2026-12-25',
    category: 'report',
    scope: 'industry',
    industry: 'fnb',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Cơ sở sản xuất thực phẩm thực hiện kiểm nghiệm định kỳ các chỉ tiêu an toàn (vi sinh, kim loại nặng, dư lượng…) theo công bố sản phẩm. Tổng hợp và lưu kết quả phục vụ truy xuất, hậu kiểm; báo cáo cơ quan quản lý khi được yêu cầu.',
    legal_basis: 'Điều 45 Luật ATTP 55/2010/QH12; Điều 4 Nghị định 15/2018/NĐ-CP; Thông tư 19/2012/TT-BYT về thử nghiệm thực phẩm.',
    penalty: 'Không thực hiện kiểm nghiệm định kỳ hoặc kết quả không đạt yêu cầu: phạt tiền và đình chỉ lưu hành theo Nghị định 115/2018/NĐ-CP (sửa đổi 124/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập kế hoạch kiểm nghiệm định kỳ theo công bố sản phẩm và quy chuẩn áp dụng',
      'Gửi mẫu đến phòng thử nghiệm được Bộ Y tế chỉ định (danh sách trên http://vinacontrol.com.vn hoặc trang Cục ATTP)',
      'Lưu phiếu kết quả kiểm nghiệm cùng hồ sơ công bố sản phẩm',
      'Lập báo cáo nội bộ; gửi cho cơ quan quản lý khi được yêu cầu',
      'Xử lý lô sản phẩm không đạt theo quy trình thu hồi/tiêu huỷ'
    ]
  },
  // ─── Y tế (industry='y_te') ────────────────────────────────────────────
  {
    title: 'Hoàn thành nghĩa vụ đào tạo CME (cập nhật kiến thức y khoa) năm 2026',
    deadline: '2026-12-31',
    category: 'labor',
    scope: 'industry',
    industry: 'y_te',
    frequency: 'yearly',
    priority: 'high',
    description: 'Người hành nghề khám bệnh, chữa bệnh (bác sĩ, y sĩ, điều dưỡng, hộ sinh, kỹ thuật viên…) phải hoàn thành tối thiểu 48 giờ CME/chu kỳ 2 năm và 120 giờ/5 năm liên tục. Đây là điều kiện bắt buộc để gia hạn giấy phép hành nghề theo Luật KCB 15/2023/QH15. Cơ sở KCB rà soát và tổ chức đào tạo cho người hành nghề trước cuối năm.',
    legal_basis: 'Điều 22 và Điều 32 Luật Khám bệnh, chữa bệnh 15/2023/QH15; Thông tư 32/2023/TT-BYT về cập nhật kiến thức y khoa liên tục; Nghị định 96/2023/NĐ-CP.',
    penalty: 'Người hành nghề không hoàn thành CME bị thu hồi giấy phép hành nghề; cơ sở sử dụng người không đủ điều kiện hành nghề bị xử phạt theo Nghị định 117/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát tổng giờ CME đã tích lũy của từng người hành nghề tại cơ sở trong chu kỳ 2 năm hiện tại',
      'Đăng ký các khóa CME của cơ sở đào tạo được Bộ Y tế công nhận (trường Y, BV hạng I, hội nghề nghiệp…)',
      'Bảo đảm mỗi người đạt tối thiểu 48 giờ/2 năm; ưu tiên các chủ đề chuyên môn phù hợp phạm vi hành nghề',
      'Lưu Giấy chứng nhận hoàn thành CME vào hồ sơ hành nghề cá nhân',
      'Tổng hợp báo cáo của cơ sở về số giờ CME đã hoàn thành; gửi Sở Y tế khi được yêu cầu'
    ]
  },
  {
    title: 'Báo cáo tình hình sử dụng thuốc gây nghiện, hướng thần, tiền chất quý 3/2026',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'y_te',
    frequency: 'quarterly',
    priority: 'high',
    description: 'Cơ sở khám chữa bệnh, cơ sở bán lẻ/bán buôn thuốc có sử dụng/kinh doanh thuốc gây nghiện, thuốc hướng thần, thuốc tiền chất phải báo cáo định kỳ hàng quý tình hình xuất-nhập-tồn cho cơ quan quản lý dược.',
    legal_basis: 'Điều 39 Luật Dược 105/2016/QH13 (sửa đổi Luật 44/2024/QH15); Điều 47 và Phụ lục Thông tư 20/2017/TT-BYT về quản lý thuốc gây nghiện, hướng thần và tiền chất dùng làm thuốc.',
    penalty: 'Báo cáo không đúng/không đầy đủ: phạt 10-30 triệu (tổ chức); vi phạm nghiêm trọng có thể bị thu hồi GCN đủ ĐK kinh doanh dược theo Nghị định 117/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số liệu nhập-xuất-tồn thuốc gây nghiện/hướng thần/tiền chất trong quý 3 (tháng 7-9)',
      'Đối chiếu với chứng từ xuất nhập, đơn thuốc đã thực hiện',
      'Lập báo cáo theo Mẫu của Thông tư 20/2017/TT-BYT',
      'Gửi Sở Y tế (đối với cơ sở khám chữa bệnh, bán lẻ) hoặc Cục Quản lý Dược (đối với cơ sở bán buôn, SX, NK)',
      'Lưu báo cáo và biên nhận tại cơ sở phục vụ kiểm tra'
    ]
  },
  {
    title: 'Kiểm định, hiệu chuẩn trang thiết bị y tế loại B, C, D định kỳ',
    deadline: '2026-11-30',
    category: 'safety',
    scope: 'industry',
    industry: 'y_te',
    frequency: 'yearly',
    priority: 'high',
    description: 'Cơ sở y tế sử dụng trang thiết bị y tế (đặc biệt loại B, C, D — máy X-quang, CT, MRI, máy thở, máy gây mê, máy chạy thận…) phải kiểm định/hiệu chuẩn định kỳ theo tài liệu kỹ thuật của nhà sản xuất và quy định của Bộ Y tế. Mốc minh hoạ — chu kỳ tùy thiết bị (thường 1-2 năm).',
    legal_basis: 'Điều 56 Nghị định 98/2021/NĐ-CP về quản lý trang thiết bị y tế (sửa đổi NĐ 07/2023/NĐ-CP); Thông tư của Bộ Y tế về kiểm định/hiệu chuẩn TBYT.',
    penalty: 'Sử dụng TBYT không được kiểm định/hiệu chuẩn theo quy định: phạt 5-15 triệu (cá nhân) hoặc gấp 2 lần (tổ chức); có thể đình chỉ sử dụng thiết bị theo Nghị định 117/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh mục TBYT loại B, C, D đang sử dụng kèm chu kỳ kiểm định/hiệu chuẩn',
      'Ký hợp đồng với tổ chức kiểm định/hiệu chuẩn được Bộ Y tế công nhận hoặc Tổng cục TCĐLCL chỉ định',
      'Tổ chức kiểm định trước khi hết hiệu lực Giấy chứng nhận trước đó',
      'Dán tem kiểm định; lưu Giấy chứng nhận kết quả kiểm định/hiệu chuẩn vào lý lịch thiết bị',
      'Ngừng sử dụng thiết bị không đạt yêu cầu cho đến khi khắc phục và kiểm định lại'
    ]
  },
  {
    title: 'Báo cáo phản ứng có hại của thuốc (ADR) định kỳ Q3/2026',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'y_te',
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Cơ sở khám chữa bệnh, cơ sở kinh doanh dược thực hiện báo cáo phản ứng có hại của thuốc (ADR — Adverse Drug Reaction) định kỳ và đột xuất (với ADR nghiêm trọng) cho Trung tâm DI&ADR Quốc gia/Khu vực.',
    legal_basis: 'Điều 78 Luật Dược 105/2016/QH13; Thông tư 23/2011/TT-BYT về hướng dẫn cảnh giác dược (và các văn bản thay thế); hướng dẫn của Trung tâm DI&ADR Quốc gia.',
    penalty: 'Không báo cáo ADR theo quy định: phạt từ 5-15 triệu đồng theo Nghị định 117/2020/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực y tế. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tập hợp tất cả phiếu báo cáo ADR đã ghi nhận tại cơ sở trong quý 3 (tháng 7-9)',
      'Phân loại ADR theo mức độ nghiêm trọng (nghiêm trọng — báo cáo trong vòng 24h-15 ngày tùy mức độ)',
      'Báo cáo trực tuyến qua hệ thống của Trung tâm DI&ADR Quốc gia (http://canhgiacduoc.org.vn)',
      'Lưu bản sao báo cáo và hồ sơ bệnh án liên quan',
      'Tổ chức bình ADR nội bộ và đào tạo nhân viên y tế về cảnh giác dược'
    ]
  },
  {
    title: 'Tự đánh giá chất lượng bệnh viện theo Bộ tiêu chí (cuối năm 2026)',
    deadline: '2026-12-30',
    category: 'report',
    scope: 'industry',
    industry: 'y_te',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Bệnh viện thực hiện tự đánh giá chất lượng theo Bộ tiêu chí chất lượng bệnh viện do Bộ Y tế ban hành. Kết quả là cơ sở để Sở Y tế phúc tra, xếp hạng bệnh viện và phục vụ thanh toán BHYT.',
    legal_basis: 'Thông tư 19/2013/TT-BYT về quản lý chất lượng bệnh viện; Quyết định 6858/QĐ-BYT năm 2016 (Bộ tiêu chí chất lượng bệnh viện phiên bản 2.0) và các văn bản cập nhật của Cục Quản lý KCB.',
    penalty: 'Không thực hiện đánh giá chất lượng có thể ảnh hưởng đến xếp hạng, phê duyệt thanh toán BHYT; vi phạm nghiêm trọng bị xử lý theo Nghị định 117/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Thành lập đoàn tự đánh giá nội bộ với sự tham gia của các phòng/khoa',
      'Thu thập minh chứng theo từng tiêu chí trong Bộ tiêu chí chất lượng bệnh viện',
      'Chấm điểm và xác định mức đạt theo từng tiêu chí',
      'Lập báo cáo kết quả tự đánh giá; gửi Sở Y tế và Cục Quản lý KCB (Bộ Y tế)',
      'Lập kế hoạch cải tiến chất lượng cho các tiêu chí chưa đạt'
    ]
  }
];

// ── Lô 4: Xây dựng (4) + BĐS (4) — chuyên ngành Pro 06-12/2026 ────────────
const INDUSTRY_XAYDUNG_BDS = [
  // ─── Xây dựng (industry='xay_dung') ─────────────────────────────────────
  {
    title: 'Báo cáo định kỳ tình hình triển khai dự án đầu tư xây dựng',
    deadline: '2026-07-15',
    category: 'report',
    scope: 'industry',
    industry: 'xay_dung',
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Chủ đầu tư báo cáo định kỳ tình hình triển khai dự án đầu tư xây dựng (tiến độ thi công, giải ngân, chất lượng, an toàn lao động) cho cơ quan quản lý nhà nước về xây dựng theo phân cấp.',
    legal_basis: 'Điều 78 và Điều 153 Luật Xây dựng 50/2014/QH13 (sửa đổi bởi Luật 62/2020/QH14); Nghị định 06/2021/NĐ-CP về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng.',
    penalty: 'Không báo cáo theo quy định: phạt 20-30 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 16/2022/NĐ-CP về xử phạt vi phạm trong lĩnh vực xây dựng. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp tiến độ thi công, giải ngân, chất lượng công trình trong kỳ',
      'Đối chiếu với hợp đồng tư vấn giám sát và biên bản nghiệm thu giai đoạn',
      'Lập báo cáo theo mẫu của Sở Xây dựng/Bộ Xây dựng (tùy phân cấp)',
      'Nộp qua Cổng dịch vụ công của Bộ Xây dựng/Sở Xây dựng',
      'Lưu hồ sơ kèm minh chứng phục vụ thanh tra'
    ]
  },
  {
    title: 'Bồi dưỡng nghiệp vụ giám sát thi công xây dựng định kỳ',
    deadline: '2026-09-30',
    category: 'labor',
    scope: 'industry',
    industry: 'xay_dung',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Cá nhân hành nghề giám sát thi công xây dựng phải tham gia bồi dưỡng nghiệp vụ định kỳ và sát hạch để duy trì/cấp lại chứng chỉ hành nghề. Đây là điều kiện duy trì năng lực HĐXD và phù hợp với cam kết trong hồ sơ năng lực tổ chức.',
    legal_basis: 'Điều 148, 149 Luật Xây dựng 50/2014 (sửa đổi 62/2020); Nghị định 15/2021/NĐ-CP về quản lý dự án đầu tư XD (sửa đổi NĐ 35/2023/NĐ-CP); Thông tư của Bộ Xây dựng về sát hạch CCHN HĐXD.',
    penalty: 'Hành nghề khi không đủ điều kiện hoặc chứng chỉ hết hạn: phạt 20-30 triệu (cá nhân) theo Điều 16 Nghị định 16/2022/NĐ-CP; tổ chức sử dụng bị xử phạt liên đới. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát danh sách cá nhân giám sát thi công đang hành nghề và hiệu lực CCHN',
      'Đăng ký lớp bồi dưỡng tại cơ sở đào tạo được Bộ Xây dựng công nhận',
      'Tham gia đầy đủ chương trình và đạt yêu cầu sát hạch',
      'Cập nhật CCHN còn hiệu lực vào hồ sơ năng lực của tổ chức',
      'Lưu chứng chỉ và quyết định công nhận năng lực cá nhân'
    ]
  },
  {
    title: 'Báo cáo công tác ATLĐ trên công trình xây dựng 6 tháng cuối năm 2026',
    deadline: '2026-12-14',
    category: 'safety',
    scope: 'industry',
    industry: 'xay_dung',
    frequency: 'yearly',
    priority: 'high',
    description: 'Nhà thầu thi công xây dựng phải tổ chức quản lý ATLĐ trong thi công xây dựng và báo cáo định kỳ kết quả thực hiện cho chủ đầu tư và cơ quan quản lý ATVSLĐ. Báo cáo 6 tháng cuối năm chốt số liệu từ 15/6 đến 14/12.',
    legal_basis: 'Điều 6, Điều 7 Thông tư 04/2017/TT-BXD về quản lý ATLĐ trong thi công xây dựng; Luật ATVSLĐ 84/2015/QH13; Nghị định 39/2016/NĐ-CP.',
    penalty: 'Không thực hiện báo cáo ATLĐ trong xây dựng: phạt 5-10 triệu đồng theo Nghị định 12/2022/NĐ-CP (lao động) và Nghị định 16/2022/NĐ-CP (xây dựng). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tập hợp biên bản kiểm tra ATLĐ, tai nạn lao động (nếu có) trên công trường trong kỳ',
      'Đánh giá việc thực hiện kế hoạch ATLĐ của từng gói thầu',
      'Lập báo cáo theo Mẫu của Thông tư 04/2017/TT-BXD',
      'Gửi cho Chủ đầu tư, Sở Xây dựng và Sở Lao động (Sở Nội vụ sau hợp nhất)',
      'Lưu hồ sơ ATLĐ tại văn phòng dự án trong suốt thời gian thi công và 5 năm sau khi hoàn thành'
    ]
  },
  {
    title: 'Báo cáo hoàn thành công trình & hồ sơ nghiệm thu đưa vào sử dụng',
    deadline: '2026-11-30',
    category: 'license',
    scope: 'industry',
    industry: 'xay_dung',
    frequency: 'once',
    priority: 'high',
    description: 'Chủ đầu tư báo cáo hoàn thành công trình và lập hồ sơ nghiệm thu đưa vào sử dụng cho cơ quan chuyên môn về xây dựng. Hồ sơ là cơ sở pháp lý cho hoạt động sử dụng công trình, đăng ký quyền sở hữu, bàn giao. Mốc là minh hoạ theo tiến độ dự án.',
    legal_basis: 'Điều 124 Luật Xây dựng 50/2014 (sửa đổi 62/2020); Điều 23, 24, 27 Nghị định 06/2021/NĐ-CP về quản lý chất lượng, thi công xây dựng và bảo trì công trình XD.',
    penalty: 'Đưa công trình vào sử dụng khi chưa được nghiệm thu/chấp thuận: phạt 80-100 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Điều 18 Nghị định 16/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổ chức nghiệm thu hoàn thành công trình theo Điều 23 NĐ 06/2021/NĐ-CP',
      'Lập hồ sơ hoàn thành công trình theo Phụ lục VI NĐ 06/2021/NĐ-CP',
      'Gửi báo cáo hoàn thành công trình tới cơ quan chuyên môn về xây dựng đã thẩm định (Sở Xây dựng/Bộ Xây dựng theo phân cấp)',
      'Chờ thông báo kết quả kiểm tra công tác nghiệm thu trong vòng 20 ngày làm việc',
      'Lưu hồ sơ hoàn thành công trình tại chủ đầu tư và bàn giao bản sao cho cơ quan quản lý sử dụng'
    ]
  },
  // ─── BĐS (industry='bds') ──────────────────────────────────────────────
  {
    title: 'Báo cáo định kỳ tình hình kinh doanh BĐS Q3/2026',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'bds',
    frequency: 'quarterly',
    priority: 'high',
    description: 'Doanh nghiệp kinh doanh BĐS và sàn giao dịch BĐS báo cáo định kỳ tình hình kinh doanh (số lượng giao dịch, giá trị, sản phẩm đưa vào kinh doanh) cho Sở Xây dựng theo Nghị định 96/2024.',
    legal_basis: 'Điều 81 Luật Kinh doanh bất động sản 29/2023/QH15; Điều 26, 27 Nghị định 96/2024/NĐ-CP hướng dẫn Luật KDBĐS.',
    penalty: 'Không báo cáo hoặc báo cáo không đúng: phạt 100-160 triệu (tổ chức) theo Điều 60 Nghị định 16/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số lượng giao dịch BĐS đã thực hiện trong quý 3 (qua sàn hoặc trực tiếp)',
      'Tổng hợp danh sách BĐS đưa vào kinh doanh, đã giao dịch, còn tồn trong kỳ',
      'Lập báo cáo theo Mẫu tại Nghị định 96/2024/NĐ-CP',
      'Gửi Sở Xây dựng nơi có dự án/sàn hoạt động',
      'Lưu báo cáo và cập nhật vào Hệ thống thông tin về nhà ở và thị trường BĐS quốc gia'
    ]
  },
  {
    title: 'Niêm yết, công khai thông tin BĐS đưa vào kinh doanh',
    deadline: '2026-08-15',
    category: 'report',
    scope: 'industry',
    industry: 'bds',
    frequency: 'once',
    priority: 'high',
    description: 'Trước khi đưa BĐS vào kinh doanh, chủ đầu tư phải công khai đầy đủ thông tin về BĐS theo quy định: pháp lý, quy hoạch, tiến độ, giá bán/cho thuê, biện pháp bảo đảm. Mốc là minh hoạ — thực hiện trước mỗi lần mở bán/mở cho thuê.',
    legal_basis: 'Điều 6 Luật Kinh doanh BĐS 29/2023/QH15; Điều 4 Nghị định 96/2024/NĐ-CP.',
    penalty: 'Không công khai thông tin hoặc công khai không đúng: phạt 100-200 triệu (tổ chức) theo Điều 58 Nghị định 16/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Chuẩn bị bộ thông tin công khai: GCN ĐKĐT, GCN QSDĐ, văn bản chấp thuận chủ trương, quy hoạch 1/500',
      'Công bố thông tin trên website doanh nghiệp; niêm yết tại trụ sở và sàn GDBĐS',
      'Gửi thông tin để cập nhật trên Hệ thống thông tin về nhà ở và thị trường BĐS quốc gia (Bộ Xây dựng)',
      'Cập nhật ngay khi có thay đổi về pháp lý, tiến độ, giá',
      'Lưu hồ sơ công khai phục vụ thanh tra và giải quyết tranh chấp'
    ]
  },
  {
    title: 'Báo cáo hoạt động năm của sàn giao dịch BĐS 2026',
    deadline: '2026-12-20',
    category: 'report',
    scope: 'industry',
    industry: 'bds',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Sàn giao dịch BĐS báo cáo tổng kết hoạt động năm: số lượng môi giới hành nghề tại sàn, số lượng giao dịch qua sàn, doanh thu hoa hồng, sản phẩm BĐS đã giao dịch.',
    legal_basis: 'Điều 56-58 Luật Kinh doanh BĐS 29/2023/QH15; Điều 26 Nghị định 96/2024/NĐ-CP.',
    penalty: 'Không báo cáo: phạt 100-160 triệu (tổ chức) theo Điều 60 Nghị định 16/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp danh sách môi giới hành nghề tại sàn cuối kỳ',
      'Tổng hợp giao dịch qua sàn (số lượng, giá trị, loại BĐS)',
      'Lập báo cáo năm theo Mẫu Nghị định 96/2024/NĐ-CP',
      'Gửi Sở Xây dựng nơi đặt trụ sở chính của sàn',
      'Cập nhật thông tin lên Hệ thống thông tin về nhà ở và thị trường BĐS quốc gia'
    ]
  },
  {
    title: 'Cập nhật dữ liệu lên Hệ thống TTQG về nhà ở & thị trường BĐS',
    deadline: '2026-12-15',
    category: 'report',
    scope: 'industry',
    industry: 'bds',
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Tổ chức, cá nhân kinh doanh BĐS có trách nhiệm cung cấp thông tin về dự án/sản phẩm BĐS đưa vào kinh doanh để cập nhật lên Hệ thống thông tin quốc gia về nhà ở và thị trường BĐS do Bộ Xây dựng quản lý.',
    legal_basis: 'Điều 71-74 Luật Kinh doanh BĐS 29/2023/QH15; Điều 19-25 Nghị định 96/2024/NĐ-CP; Nghị định 44/2022/NĐ-CP về xây dựng, quản lý và sử dụng Hệ thống thông tin về nhà ở và thị trường BĐS.',
    penalty: 'Không cung cấp/cập nhật thông tin: phạt 60-100 triệu (tổ chức) theo Điều 60 Nghị định 16/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Đăng ký tài khoản trên Hệ thống thông tin về nhà ở và thị trường BĐS quốc gia',
      'Cập nhật thông tin dự án: pháp lý, quy hoạch, tiến độ, sản phẩm đưa ra thị trường',
      'Báo cáo định kỳ giao dịch BĐS qua sàn/trực tiếp',
      'Cập nhật chỉ số giá BĐS, lượng giao dịch theo yêu cầu của Sở Xây dựng',
      'Lưu xác nhận cập nhật và biên nhận điện tử'
    ]
  }
];

// ── Lô 5: XNK (4) + Logistic (4) ──────────────────────────────────────────
const INDUSTRY_XNK_LOGISTIC = [
  // ─── XNK (industry='xnk') ──────────────────────────────────────────────
  {
    title: 'Thanh khoản hợp đồng gia công xuất khẩu đến hạn',
    deadline: '2026-08-30',
    category: 'license',
    scope: 'industry',
    industry: 'xnk',
    frequency: 'once',
    priority: 'high',
    description: 'Tổ chức nhận gia công xuất khẩu phải làm thủ tục thanh khoản hợp đồng gia công với cơ quan hải quan khi hợp đồng kết thúc/hết hạn, bao gồm đối chiếu nguyên liệu vật tư đã nhập, sản phẩm đã xuất, phế liệu phế phẩm. Mốc là minh hoạ — thực hiện theo từng hợp đồng.',
    legal_basis: 'Điều 36 Nghị định 08/2015/NĐ-CP (sửa đổi Nghị định 59/2018/NĐ-CP) về thủ tục hải quan; Thông tư 39/2018/TT-BTC sửa đổi Thông tư 38/2015/TT-BTC.',
    penalty: 'Không thanh khoản đúng hạn: phạt theo Nghị định 128/2020/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực hải quan; có thể bị truy thu thuế đối với nguyên liệu không sử dụng đúng mục đích. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dữ liệu nhập-xuất-tồn nguyên liệu, vật tư theo từng hợp đồng gia công',
      'Đối chiếu với tờ khai nhập khẩu nguyên liệu và xuất khẩu sản phẩm',
      'Lập báo cáo quyết toán/thanh khoản theo Mẫu Phụ lục VII NĐ 08/2015',
      'Nộp hồ sơ qua Hệ thống VNACCS/VCIS hoặc Cổng dịch vụ công của Tổng cục Hải quan',
      'Xử lý phần chênh lệch, phế liệu phế phẩm theo quy định (tái xuất/tiêu hủy/chuyển tiêu thụ nội địa)'
    ]
  },
  {
    title: 'Bồi dưỡng nghiệp vụ khai báo hải quan định kỳ',
    deadline: '2026-10-30',
    category: 'labor',
    scope: 'industry',
    industry: 'xnk',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Đại lý làm thủ tục hải quan và nhân viên khai báo hải quan phải tham gia bồi dưỡng cập nhật nghiệp vụ định kỳ để duy trì hiệu lực chứng chỉ nghiệp vụ khai hải quan và mã số nhân viên đại lý.',
    legal_basis: 'Điều 20 Luật Hải quan 54/2014/QH13; Nghị định 14/2018/NĐ-CP về đại lý làm thủ tục hải quan; Thông tư 22/2019/TT-BTC sửa đổi Thông tư 12/2015/TT-BTC.',
    penalty: 'Sử dụng nhân viên đại lý HQ không đủ điều kiện: bị Tổng cục HQ thu hồi mã số nhân viên và xử phạt theo Nghị định 128/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát danh sách nhân viên đại lý hải quan và hiệu lực chứng chỉ',
      'Đăng ký lớp bồi dưỡng tại cơ sở đào tạo được Tổng cục Hải quan công nhận (Trường Hải quan VN…)',
      'Hoàn thành chương trình và đạt yêu cầu sát hạch',
      'Cập nhật mã số nhân viên đại lý hải quan tại Tổng cục Hải quan (qua hệ thống điện tử)',
      'Lưu chứng chỉ vào hồ sơ nhân sự của đại lý'
    ]
  },
  {
    title: 'Báo cáo tình hình hàng hóa tại kho ngoại quan/CFS Q3/2026',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'xnk',
    frequency: 'quarterly',
    priority: 'high',
    description: 'Chủ kho ngoại quan, kho CFS (Container Freight Station), kho bảo thuế báo cáo định kỳ tình hình hàng hóa nhập-xuất-tồn kho cho Chi cục Hải quan quản lý kho.',
    legal_basis: 'Điều 84-87 Nghị định 08/2015/NĐ-CP (sửa đổi NĐ 59/2018, NĐ 18/2021); Điều 88 Thông tư 39/2018/TT-BTC sửa đổi Thông tư 38/2015/TT-BTC.',
    penalty: 'Không báo cáo hoặc báo cáo sai: phạt 5-15 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 128/2020/NĐ-CP; có thể bị đình chỉ hoạt động kho. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dữ liệu nhập-xuất-tồn hàng hóa trong kỳ theo từng chủ hàng',
      'Đối chiếu chứng từ nhập (tờ khai NK, vận đơn) và xuất (tờ khai XK, lệnh xuất kho)',
      'Lập báo cáo theo Mẫu Phụ lục VIII Thông tư 39/2018/TT-BTC',
      'Gửi Chi cục Hải quan quản lý kho qua Hệ thống VNACCS hoặc văn bản',
      'Lưu báo cáo và xử lý hàng tồn quá thời hạn theo quy định'
    ]
  },
  {
    title: 'Rà soát, gia hạn Giấy chứng nhận DN ưu tiên (AEO)',
    deadline: '2026-09-30',
    category: 'license',
    scope: 'industry',
    industry: 'xnk',
    frequency: 'once',
    priority: 'high',
    description: 'Doanh nghiệp đã được công nhận là DN ưu tiên trong lĩnh vực hải quan (AEO) phải duy trì điều kiện và làm thủ tục gia hạn trước khi GCN hết hạn (chu kỳ 3 năm). DN AEO được hưởng nhiều ưu đãi: miễn kiểm tra hồ sơ/thực tế, ưu tiên thông quan, ân hạn thuế.',
    legal_basis: 'Điều 42-44 Luật Hải quan 54/2014/QH13; Thông tư 72/2015/TT-BTC sửa đổi Thông tư 07/2019/TT-BTC về DN ưu tiên trong lĩnh vực hải quan.',
    penalty: 'Mất hiệu lực GCN DN ưu tiên dẫn đến mất các ưu đãi về thủ tục, kiểm tra và thanh toán thuế; vi phạm điều kiện duy trì có thể bị thu hồi GCN. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát hiệu lực GCN DN ưu tiên và điều kiện duy trì (tuân thủ pháp luật, kim ngạch XNK, hệ thống kiểm soát nội bộ)',
      'Chuẩn bị hồ sơ gia hạn: đơn đề nghị, báo cáo tự đánh giá, hồ sơ kim ngạch XNK',
      'Nộp hồ sơ tại Tổng cục Hải quan trước khi GCN hết hạn ≥ 60 ngày',
      'Tiếp đoàn thẩm định tại trụ sở DN (nếu có)',
      'Nhận Quyết định gia hạn (hiệu lực 03 năm) và cập nhật vào hồ sơ pháp lý'
    ]
  },
  // ─── Logistic (industry='logistic') ────────────────────────────────────
  {
    title: 'Cập nhật, gia hạn phù hiệu/biển hiệu phương tiện vận tải đợt cuối năm',
    deadline: '2026-11-30',
    category: 'license',
    scope: 'industry',
    industry: 'logistic',
    frequency: 'yearly',
    priority: 'high',
    description: 'Doanh nghiệp kinh doanh vận tải bằng xe ô tô (theo hợp đồng, du lịch, tuyến cố định, taxi, container) phải duy trì phù hiệu/biển hiệu hợp lệ cho từng phương tiện. Tổ chức rà soát đợt cuối năm để gia hạn cho các phương tiện hết hạn trong Q1 năm sau.',
    legal_basis: 'Điều 22 Nghị định 10/2020/NĐ-CP về kinh doanh và điều kiện kinh doanh vận tải bằng xe ô tô (sửa đổi NĐ 41/2024/NĐ-CP); Thông tư 12/2020/TT-BGTVT.',
    penalty: 'Phương tiện không có phù hiệu/biển hiệu hoặc hết hạn: phạt 5-7 triệu đồng (lái xe) và 6-8 triệu (DN) theo Nghị định 100/2019/NĐ-CP (sửa đổi NĐ 123/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh sách phương tiện và hiệu lực phù hiệu/biển hiệu hiện tại',
      'Chuẩn bị hồ sơ gia hạn: giấy đăng ký xe, đăng kiểm còn hiệu lực, hợp đồng vận tải',
      'Nộp hồ sơ qua Cổng dịch vụ công của Sở Giao thông Vận tải',
      'Nhận phù hiệu/biển hiệu mới và dán đúng vị trí trên phương tiện',
      'Lưu sổ theo dõi cấp/gia hạn phù hiệu tại doanh nghiệp'
    ]
  },
  {
    title: 'Đào tạo nghiệp vụ vận tải, ATGT cho lái xe kinh doanh vận tải',
    deadline: '2026-09-30',
    category: 'labor',
    scope: 'industry',
    industry: 'logistic',
    frequency: 'yearly',
    priority: 'high',
    description: 'Lái xe và nhân viên phục vụ trên xe của doanh nghiệp kinh doanh vận tải phải tham gia tập huấn nghiệp vụ vận tải và an toàn giao thông định kỳ ít nhất 01 lần/năm.',
    legal_basis: 'Điều 11 Nghị định 10/2020/NĐ-CP (sửa đổi NĐ 41/2024); Thông tư 12/2020/TT-BGTVT về tổ chức, quản lý hoạt động vận tải bằng xe ô tô.',
    penalty: 'Không tổ chức tập huấn cho lái xe: phạt 1-3 triệu (cá nhân) hoặc 2-4 triệu (tổ chức) theo Nghị định 100/2019/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh sách lái xe và nhân viên phục vụ trên xe',
      'Tổ chức tập huấn nội bộ (DN tự tổ chức được phép) hoặc thuê đơn vị đủ điều kiện',
      'Nội dung bắt buộc: kiến thức pháp luật về vận tải, kỹ năng giao tiếp, sơ cấp cứu',
      'Cấp giấy chứng nhận hoàn thành tập huấn',
      'Lưu hồ sơ tập huấn tại doanh nghiệp; gửi báo cáo cho Sở GTVT khi được yêu cầu'
    ]
  },
  {
    title: 'Báo cáo hoạt động vận tải năm 2026 cho Sở GTVT',
    deadline: '2026-12-30',
    category: 'report',
    scope: 'industry',
    industry: 'logistic',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Doanh nghiệp, HTX kinh doanh vận tải bằng xe ô tô báo cáo định kỳ hoạt động vận tải (số lượng phương tiện, lái xe, chuyến vận chuyển, doanh thu, sự cố ATGT) cho Sở GTVT.',
    legal_basis: 'Điều 24 Nghị định 10/2020/NĐ-CP về kinh doanh và điều kiện kinh doanh vận tải bằng xe ô tô (sửa đổi NĐ 41/2024/NĐ-CP).',
    penalty: 'Không báo cáo: phạt 2-4 triệu (tổ chức) theo Nghị định 100/2019/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực giao thông đường bộ. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số lượng phương tiện, lái xe đang hoạt động cuối kỳ',
      'Tổng hợp số chuyến vận chuyển, doanh thu, các vụ ATGT (nếu có)',
      'Lập báo cáo theo Mẫu của Sở GTVT/Bộ GTVT',
      'Nộp qua Cổng dịch vụ công của Sở GTVT',
      'Lưu báo cáo và xử lý kiến nghị (nếu có)'
    ]
  },
  {
    title: 'Đăng kiểm phương tiện vận tải định kỳ',
    deadline: '2026-09-30',
    category: 'safety',
    scope: 'industry',
    industry: 'logistic',
    frequency: 'yearly',
    priority: 'high',
    description: 'Xe ô tô tham gia giao thông phải được kiểm định an toàn kỹ thuật và bảo vệ môi trường theo chu kỳ (tùy loại xe và năm sản xuất). Doanh nghiệp vận tải tổ chức đăng kiểm trước khi hết hạn để duy trì khả năng kinh doanh.',
    legal_basis: 'Luật Giao thông đường bộ 23/2008/QH12; Nghị định 139/2018/NĐ-CP về kinh doanh dịch vụ kiểm định xe cơ giới (sửa đổi NĐ 30/2023, NĐ 139/2024); Thông tư 16/2021/TT-BGTVT về kiểm định an toàn kỹ thuật xe cơ giới.',
    penalty: 'Xe quá hạn đăng kiểm: phạt 4-6 triệu (cá nhân) và 8-12 triệu (tổ chức) theo Nghị định 100/2019/NĐ-CP; bị tước quyền sử dụng GPLX. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Theo dõi hạn đăng kiểm của từng phương tiện qua sổ theo dõi/phần mềm quản lý',
      'Lên kế hoạch đưa xe đến Trung tâm đăng kiểm trước khi hết hạn 15-30 ngày',
      'Chuẩn bị xe đạt yêu cầu kỹ thuật: phanh, lốp, đèn, khí thải, GSHT, camera',
      'Khắc phục ngay các lỗi nếu chưa đạt; quay lại đăng kiểm lại',
      'Lưu Giấy chứng nhận kiểm định và tem kiểm định lên xe'
    ]
  }
];

// ── Lô 6: Sản xuất (4) + Năng lượng (4) ──────────────────────────────────
const INDUSTRY_SANXUAT_NANGLUONG = [
  // ─── Sản xuất (industry='san_xuat') ────────────────────────────────────
  {
    title: 'Báo cáo quản lý chất thải nguy hại Q3/2026 (chủ nguồn thải)',
    deadline: '2026-10-15',
    category: 'environment',
    scope: 'industry',
    industry: 'san_xuat',
    frequency: 'quarterly',
    priority: 'high',
    description: 'Chủ nguồn thải chất thải nguy hại (CTNH) trong lĩnh vực sản xuất tổng hợp khối lượng phát sinh, chuyển giao và xử lý trong quý 3 để báo cáo cơ quan quản lý môi trường địa phương.',
    legal_basis: 'Điều 71 Luật Bảo vệ môi trường 72/2020/QH14; Thông tư 02/2022/TT-BTNMT (sửa đổi Thông tư 07/2025/TT-BTNMT) quy định chi tiết thi hành Luật BVMT.',
    penalty: 'Báo cáo không đầy đủ/không kịp thời: phạt 10-20 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 45/2022/NĐ-CP về xử phạt VPHC trong lĩnh vực BVMT. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp khối lượng CTNH phát sinh theo từng mã CTNH trong quý 3',
      'Đối chiếu chứng từ chuyển giao với đơn vị xử lý CTNH có giấy phép',
      'Lập báo cáo theo Mẫu Phụ lục III Thông tư 02/2022/TT-BTNMT',
      'Gửi báo cáo cho Sở Tài nguyên & Môi trường địa phương qua Hệ thống thông tin EMC hoặc văn bản',
      'Lưu hồ sơ và chứng từ chuyển giao CTNH trong tối thiểu 5 năm'
    ]
  },
  {
    title: 'Huấn luyện an toàn hóa chất định kỳ',
    deadline: '2026-09-30',
    category: 'safety',
    scope: 'industry',
    industry: 'san_xuat',
    frequency: 'yearly',
    priority: 'high',
    description: 'Cơ sở hoạt động hoá chất (sản xuất, kinh doanh, sử dụng) phải tổ chức huấn luyện an toàn hóa chất cho người trực tiếp tiếp xúc và quản lý hóa chất; huấn luyện lần đầu và huấn luyện định kỳ ít nhất 02 năm/lần.',
    legal_basis: 'Điều 32 Luật Hóa chất 06/2007/QH12; Điều 31 Nghị định 113/2017/NĐ-CP (sửa đổi NĐ 82/2022); Thông tư 36/2014/TT-BCT về huấn luyện an toàn hóa chất.',
    penalty: 'Không tổ chức huấn luyện ATHC: phạt 12-20 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 71/2019/NĐ-CP (sửa đổi NĐ 17/2022/NĐ-CP) về XPHC trong lĩnh vực hóa chất. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh sách người làm việc trực tiếp với hóa chất, người quản lý, người chỉ huy sản xuất',
      'Ký hợp đồng với tổ chức huấn luyện ATHC được Bộ Công Thương cấp Giấy xác nhận',
      'Tổ chức huấn luyện và kiểm tra theo nội dung tại TT 36/2014/TT-BCT',
      'Cấp Giấy chứng nhận hoàn thành huấn luyện cho người đạt yêu cầu',
      'Lưu hồ sơ huấn luyện và cập nhật hồ sơ ATHC của cơ sở'
    ]
  },
  {
    title: 'Công bố hợp chuẩn/hợp quy sản phẩm sản xuất',
    deadline: '2026-09-15',
    category: 'license',
    scope: 'industry',
    industry: 'san_xuat',
    frequency: 'once',
    priority: 'medium',
    description: 'Sản phẩm thuộc danh mục hàng hóa nhóm 2 (có khả năng gây mất an toàn) phải được chứng nhận và công bố hợp quy trước khi đưa ra thị trường. Sản phẩm thuộc nhóm 1 có thể tự nguyện chứng nhận hợp chuẩn. Mốc minh hoạ — thực hiện theo từng sản phẩm.',
    legal_basis: 'Điều 12 Luật Tiêu chuẩn và quy chuẩn kỹ thuật 68/2006/QH11; Luật Chất lượng sản phẩm hàng hóa 05/2007/QH12; Thông tư 28/2012/TT-BKHCN (sửa đổi TT 02/2017/TT-BKHCN) về công bố hợp chuẩn, hợp quy.',
    penalty: 'Sản phẩm thuộc diện phải công bố hợp quy mà chưa công bố: phạt 30-50 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 119/2017/NĐ-CP (sửa đổi NĐ 126/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tra cứu QCVN áp dụng và danh mục hàng hóa nhóm 2 do các Bộ ban hành',
      'Lựa chọn tổ chức chứng nhận hợp quy (được Bộ chỉ định) và lấy mẫu thử nghiệm',
      'Nhận Giấy chứng nhận hợp quy và lập bản công bố hợp quy (Mẫu 2 TT 28/2012)',
      'Đăng ký bản công bố tại Cơ quan chuyên ngành tiếp nhận (Sở/Cục theo lĩnh vực)',
      'Gắn dấu hợp quy (CR) lên sản phẩm và lưu hồ sơ tối thiểu 3 năm'
    ]
  },
  {
    title: 'Báo cáo công tác BVMT năm 2026 (cơ sở sản xuất, kinh doanh, dịch vụ)',
    deadline: '2026-12-30',
    category: 'environment',
    scope: 'industry',
    industry: 'san_xuat',
    frequency: 'yearly',
    priority: 'high',
    description: 'Cơ sở sản xuất, kinh doanh, dịch vụ thuộc đối tượng có Giấy phép môi trường/đăng ký môi trường phải tổng hợp và báo cáo công tác BVMT năm 2026: xả thải, chất thải, sự cố, kết quả quan trắc và biện pháp khắc phục. Hạn nộp chính thức trước 15/01/2027 nhưng nên hoàn thành dự thảo cuối năm.',
    legal_basis: 'Điều 119 Luật Bảo vệ môi trường 72/2020/QH14; Điều 66 Thông tư 02/2022/TT-BTNMT (sửa đổi bởi điểm a khoản 19 Điều 1 Thông tư 07/2025/TT-BTNMT).',
    penalty: 'Không lập/báo cáo công tác BVMT: phạt 10-20 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 45/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dữ liệu năm: lượng nguyên liệu sử dụng, lượng chất thải phát sinh (rắn, lỏng, khí, CTNH)',
      'Tổng hợp kết quả quan trắc môi trường định kỳ trong năm',
      'Lập báo cáo theo Mẫu Phụ lục VI Thông tư 02/2022/TT-BTNMT',
      'Gửi qua Hệ thống thông tin EMC của Bộ TN&MT cho Sở TN&MT/Bộ TN&MT theo phân cấp trước 15/01/2027',
      'Lưu báo cáo và minh chứng quan trắc, chuyển giao chất thải'
    ]
  },
  // ─── Năng lượng (industry='nang_luong') ────────────────────────────────
  {
    title: 'Báo cáo tình hình sử dụng năng lượng năm 2026 (cơ sở sử dụng NL trọng điểm)',
    deadline: '2026-12-15',
    category: 'report',
    scope: 'industry',
    industry: 'nang_luong',
    frequency: 'yearly',
    priority: 'high',
    description: 'Cơ sở sử dụng năng lượng trọng điểm (theo Quyết định công bố hằng năm của Thủ tướng) báo cáo tổng hợp tình hình sử dụng năng lượng năm: nhiên liệu, điện, các giải pháp tiết kiệm năng lượng đã thực hiện.',
    legal_basis: 'Điều 33 Luật Sử dụng năng lượng tiết kiệm và hiệu quả 50/2010/QH12; Điều 6-7 Nghị định 21/2011/NĐ-CP (sửa đổi NĐ 32/2018/NĐ-CP).',
    penalty: 'Không báo cáo: phạt 10-20 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 17/2022/NĐ-CP (sửa đổi NĐ 71/2019). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dữ liệu tiêu thụ NL theo từng loại (điện, than, dầu, gas, sinh khối) trong năm',
      'Tính tổng quy đổi tiêu thụ NL ra tấn dầu tương đương (TOE)',
      'Tổng hợp các giải pháp tiết kiệm NL đã thực hiện và kết quả',
      'Lập báo cáo theo Mẫu Phụ lục Nghị định 21/2011/NĐ-CP',
      'Gửi Sở Công Thương (DN có TOE ≥ 1000 thì gửi cả Bộ Công Thương) qua hệ thống dữ liệu năng lượng'
    ]
  },
  {
    title: 'Bổ nhiệm và đào tạo cán bộ quản lý năng lượng',
    deadline: '2026-09-30',
    category: 'labor',
    scope: 'industry',
    industry: 'nang_luong',
    frequency: 'yearly',
    priority: 'medium',
    description: 'Cơ sở sử dụng năng lượng trọng điểm phải bổ nhiệm người quản lý năng lượng và đào tạo đạt yêu cầu theo quy định. Đào tạo và sát hạch cấp chứng chỉ quản lý năng lượng do Bộ Công Thương tổ chức.',
    legal_basis: 'Điều 35 Luật Sử dụng năng lượng tiết kiệm và hiệu quả 50/2010/QH12; Điều 7 Nghị định 21/2011/NĐ-CP; Thông tư 09/2012/TT-BCT về đào tạo, cấp chứng chỉ quản lý năng lượng.',
    penalty: 'Không bổ nhiệm/đào tạo người QL năng lượng: phạt 10-20 triệu (tổ chức) theo Nghị định 17/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát danh sách người quản lý năng lượng đang công tác và hiệu lực chứng chỉ',
      'Đăng ký lớp đào tạo người quản lý năng lượng tại đơn vị được Bộ Công Thương công nhận',
      'Cá nhân tham gia đầy đủ chương trình và đạt yêu cầu sát hạch của Bộ Công Thương',
      'Nhận chứng chỉ quản lý năng lượng và bổ nhiệm chính thức',
      'Cập nhật quyết định bổ nhiệm vào hồ sơ với Sở Công Thương'
    ]
  },
  {
    title: 'Kê khai dán nhãn năng lượng cho sản phẩm sản xuất/nhập khẩu',
    deadline: '2026-11-30',
    category: 'license',
    scope: 'industry',
    industry: 'nang_luong',
    frequency: 'once',
    priority: 'medium',
    description: 'Phương tiện, thiết bị thuộc Danh mục dán nhãn năng lượng bắt buộc (đèn LED, điều hòa, tủ lạnh, máy giặt, nồi cơm điện, động cơ điện…) phải được dán nhãn năng lượng trước khi đưa ra thị trường. Mốc là minh hoạ — thực hiện theo lô.',
    legal_basis: 'Điều 39 Luật Sử dụng năng lượng tiết kiệm và hiệu quả 50/2010/QH12; Quyết định 14/2017/QĐ-TTg (Danh mục); Thông tư 36/2016/TT-BCT về dán nhãn năng lượng (sửa đổi TT 24/2024/TT-BCT).',
    penalty: 'Đưa ra thị trường sản phẩm thuộc danh mục mà không dán nhãn: phạt 50-70 triệu (tổ chức) theo Nghị định 17/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Đối chiếu sản phẩm với Danh mục dán nhãn năng lượng bắt buộc (QĐ 14/2017/QĐ-TTg và cập nhật)',
      'Gửi mẫu đến phòng thử nghiệm hiệu suất NL được Bộ Công Thương chỉ định',
      'Nộp hồ sơ kê khai dán nhãn năng lượng tại Bộ Công Thương (qua Cổng DVC)',
      'In và dán nhãn năng lượng đúng mẫu lên sản phẩm/bao bì',
      'Lưu hồ sơ kê khai và kết quả thử nghiệm hiệu suất'
    ]
  },
  {
    title: 'Báo cáo định kỳ tiêu thụ năng lượng Q3/2026 cho Sở Công Thương',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'nang_luong',
    frequency: 'quarterly',
    priority: 'medium',
    description: 'Doanh nghiệp thuộc diện báo cáo tiêu thụ NL theo Nghị định 21/2011/NĐ-CP thực hiện báo cáo định kỳ (tháng/quý/năm tùy phân loại) cho Sở Công Thương qua hệ thống quản lý dữ liệu năng lượng quốc gia.',
    legal_basis: 'Điều 6 Nghị định 21/2011/NĐ-CP về Luật Sử dụng năng lượng tiết kiệm và hiệu quả (sửa đổi NĐ 32/2018/NĐ-CP); hướng dẫn của Cục Tiết kiệm năng lượng và Phát triển bền vững (Bộ Công Thương).',
    penalty: 'Không báo cáo định kỳ: phạt 5-10 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 17/2022/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dữ liệu tiêu thụ năng lượng theo từng nguồn trong quý 3',
      'Cập nhật vào Hệ thống quản lý dữ liệu năng lượng (https://dataenergy.vn) hoặc gửi văn bản',
      'Đối chiếu với hóa đơn điện, xăng dầu, khí đốt trong kỳ',
      'Gửi báo cáo cho Sở Công Thương trước hạn',
      'Lưu báo cáo và biên nhận điện tử'
    ]
  }
];

// ── Lô 7: IT (3) + Tài chính (3) + Dịch vụ pháp lý (3) ────────────────────
const INDUSTRY_IT_TC_DVPL = [
  // ─── IT (industry='it') ────────────────────────────────────────────────
  {
    title: 'Đánh giá tác động xử lý dữ liệu cá nhân (DPIA) định kỳ',
    deadline: '2026-10-15',
    category: 'license',
    scope: 'industry',
    industry: 'it',
    frequency: 'yearly',
    priority: 'high',
    description: 'Tổ chức xử lý dữ liệu cá nhân phải lập và lưu giữ Hồ sơ đánh giá tác động xử lý DLCN (DPIA — Data Processing Impact Assessment), Hồ sơ đánh giá tác động chuyển DLCN ra nước ngoài. Cập nhật khi có thay đổi hoặc định kỳ theo quy định của Bộ Công an.',
    legal_basis: 'Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực 01/01/2026); Điều 24, 25 Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.',
    penalty: 'Không lập DPIA hoặc không cung cấp khi cơ quan có thẩm quyền yêu cầu: phạt theo quy định mới của NĐ xử phạt VPHC trong lĩnh vực BVDLCN. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lập danh mục hoạt động xử lý DLCN tại doanh nghiệp',
      'Đánh giá rủi ro: loại DLCN, mục đích, biện pháp bảo vệ, nguy cơ rò rỉ',
      'Lập Hồ sơ DPIA theo Mẫu Phụ lục Nghị định 13/2023/NĐ-CP',
      'Gửi Cục An ninh mạng và phòng chống tội phạm sử dụng công nghệ cao (A05) — Bộ Công an trong 60 ngày kể từ khi bắt đầu xử lý DLCN',
      'Cập nhật DPIA khi có thay đổi hoạt động xử lý hoặc bổ sung loại DLCN nhạy cảm'
    ]
  },
  {
    title: 'Phê duyệt cấp độ và phương án bảo đảm ATTT hệ thống thông tin',
    deadline: '2026-09-30',
    category: 'safety',
    scope: 'industry',
    industry: 'it',
    frequency: 'yearly',
    priority: 'high',
    description: 'Chủ quản hệ thống thông tin (HTTT) phải phân loại HTTT theo cấp độ 1-5 và lập phương án bảo đảm ATTT theo cấp độ, được cơ quan có thẩm quyền phê duyệt. Định kỳ rà soát, cập nhật cấp độ và phương án.',
    legal_basis: 'Điều 21 Luật An toàn thông tin mạng 86/2015/QH13; Nghị định 85/2016/NĐ-CP về bảo đảm ATTT theo cấp độ; Thông tư 12/2022/TT-BTTTT.',
    penalty: 'Không phân loại cấp độ hoặc không bảo đảm ATTT theo cấp độ: phạt 30-50 triệu (tổ chức) theo Nghị định 15/2020/NĐ-CP (sửa đổi NĐ 14/2022/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Phân loại HTTT theo Phụ lục Nghị định 85/2016/NĐ-CP (cấp độ 1-5 dựa trên mức độ quan trọng)',
      'Lập Hồ sơ đề xuất cấp độ ATTT cho từng HTTT',
      'Trình phê duyệt: cấp 1-3 do DN tự phê duyệt; cấp 4-5 cần Bộ TT&KH (sau hợp nhất) phê duyệt',
      'Triển khai phương án ATTT theo cấp độ đã phê duyệt (kiểm soát truy cập, mã hóa, sao lưu, giám sát)',
      'Rà soát và cập nhật định kỳ ít nhất 1 năm/lần'
    ]
  },
  {
    title: 'Báo cáo định kỳ hoạt động dịch vụ MXH/TTĐT/game (NĐ 147/2024)',
    deadline: '2026-12-15',
    category: 'report',
    scope: 'industry',
    industry: 'it',
    frequency: 'yearly',
    priority: 'medium',
    description: 'DN cung cấp dịch vụ mạng xã hội, trang thông tin điện tử tổng hợp, dịch vụ trò chơi điện tử trên mạng (G1/G2/G3/G4) báo cáo định kỳ hoạt động cho cơ quan quản lý: số tài khoản, lượng truy cập, biện pháp xử lý nội dung vi phạm.',
    legal_basis: 'Nghị định 147/2024/NĐ-CP về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng (thay thế NĐ 72/2013/NĐ-CP).',
    penalty: 'Không báo cáo hoặc báo cáo không đúng: phạt 10-30 triệu (tổ chức) theo Nghị định 147/2024 và Nghị định 15/2020 (sửa đổi 14/2022). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số tài khoản đăng ký, tài khoản hoạt động, lượng truy cập, doanh thu trong kỳ',
      'Tổng hợp các trường hợp xử lý nội dung vi phạm (gỡ bỏ, khóa tài khoản)',
      'Lập báo cáo theo Mẫu của Cục PTTH&TTĐT/Sở TT&TT',
      'Gửi báo cáo qua Cổng dịch vụ công của Bộ TT&TT (Bộ KH&CN sau hợp nhất) hoặc Sở TT&TT theo phân cấp',
      'Lưu báo cáo và xác nhận hoàn thành định danh người dùng (nếu yêu cầu)'
    ]
  },
  // ─── Tài chính (industry='tai_chinh') ──────────────────────────────────
  {
    title: 'Báo cáo phòng chống rửa tiền (AML) định kỳ Q3/2026',
    deadline: '2026-10-15',
    category: 'report',
    scope: 'industry',
    industry: 'tai_chinh',
    frequency: 'quarterly',
    priority: 'high',
    description: 'Đối tượng báo cáo (TCTD, công ty chứng khoán, công ty bảo hiểm, kinh doanh trò chơi có thưởng, sàn vàng, môi giới BĐS…) thực hiện báo cáo giao dịch lớn, giao dịch đáng ngờ và báo cáo định kỳ cho Cục Phòng chống rửa tiền (NHNN).',
    legal_basis: 'Điều 25-26 Luật Phòng chống rửa tiền 14/2022/QH15; Nghị định 19/2023/NĐ-CP; Thông tư 09/2023/TT-NHNN.',
    penalty: 'Không báo cáo giao dịch đáng ngờ/lớn: phạt 30-50 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 88/2019/NĐ-CP (sửa đổi NĐ 143/2021/NĐ-CP). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp giao dịch giá trị lớn (≥ 400tr đồng/ngày) và giao dịch chuyển tiền điện tử quốc tế trong kỳ',
      'Rà soát phát hiện giao dịch đáng ngờ theo tiêu chí của Cục Phòng chống rửa tiền',
      'Lập báo cáo điện tử qua hệ thống AMLIS (NHNN)',
      'Lưu hồ sơ giao dịch và biện pháp nhận biết khách hàng (KYC) trong tối thiểu 5 năm',
      'Tổ chức đào tạo nội bộ về PCRT định kỳ cho nhân viên'
    ]
  },
  {
    title: 'Báo cáo tình hình hoạt động định kỳ với NHNN (TCTD, CTTC, công ty cho thuê TC)',
    deadline: '2026-12-15',
    category: 'report',
    scope: 'industry',
    industry: 'tai_chinh',
    frequency: 'monthly',
    priority: 'high',
    description: 'Tổ chức tín dụng, công ty tài chính, công ty cho thuê tài chính, văn phòng đại diện TCTD nước ngoài thực hiện báo cáo định kỳ về tình hình tài chính, hoạt động, an toàn vốn cho Ngân hàng Nhà nước theo chế độ báo cáo thống kê ngành Ngân hàng.',
    legal_basis: 'Luật Các tổ chức tín dụng 32/2024/QH15; Thông tư 35/2015/TT-NHNN (sửa đổi bởi các văn bản cập nhật) về chế độ báo cáo thống kê ngành Ngân hàng.',
    penalty: 'Không báo cáo hoặc báo cáo không trung thực: phạt 30-50 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 88/2019/NĐ-CP. Có thể bị áp dụng biện pháp xử lý của NHNN. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp số liệu hoạt động theo Phụ lục chế độ báo cáo thống kê ngành Ngân hàng',
      'Đối chiếu với hệ thống core banking và sổ kế toán',
      'Gửi báo cáo qua hệ thống báo cáo thống kê của NHNN (BCTC + chỉ tiêu giám sát an toàn)',
      'Lưu báo cáo, giải trình các chỉ tiêu bất thường',
      'Bổ sung hồ sơ khi NHNN yêu cầu giám sát đặc biệt'
    ]
  },
  {
    title: 'Cập nhật và báo cáo dữ liệu cho Trung tâm Thông tin tín dụng (CIC)',
    deadline: '2026-11-15',
    category: 'report',
    scope: 'industry',
    industry: 'tai_chinh',
    frequency: 'monthly',
    priority: 'high',
    description: 'Tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, công ty tài chính, tổ chức được phép hoạt động tín dụng phải cung cấp thông tin tín dụng của khách hàng cho Trung tâm Thông tin tín dụng quốc gia (CIC) định kỳ và đột xuất.',
    legal_basis: 'Luật Các tổ chức tín dụng 32/2024/QH15; Thông tư 03/2013/TT-NHNN về hoạt động thông tin tín dụng của NHNN (sửa đổi bởi các văn bản cập nhật); hướng dẫn vận hành của CIC.',
    penalty: 'Không cung cấp/cung cấp sai thông tin cho CIC: phạt 20-40 triệu (tổ chức) theo Nghị định 88/2019/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp dư nợ, lịch sử thanh toán, phân loại nhóm nợ của khách hàng trong kỳ',
      'Đối chiếu với hệ thống core banking và phân loại nợ theo TT 11/2021/TT-NHNN',
      'Truyền dữ liệu qua hệ thống của CIC (https://cic.gov.vn) theo định dạng quy định',
      'Xử lý phản hồi/khiếu nại thông tin tín dụng từ khách hàng',
      'Lưu nhật ký truyền dữ liệu và biên nhận xác nhận của CIC'
    ]
  },
  // ─── Dịch vụ pháp lý (industry='dich_vu_pl') ──────────────────────────
  {
    title: 'Báo cáo tổ chức và hoạt động hành nghề luật sư năm 2026',
    deadline: '2026-12-30',
    category: 'report',
    scope: 'industry',
    industry: 'dich_vu_pl',
    frequency: 'yearly',
    priority: 'high',
    description: 'Tổ chức hành nghề luật sư (văn phòng luật sư, công ty luật) báo cáo định kỳ năm về tổ chức và hoạt động cho Sở Tư pháp nơi đăng ký hoạt động và Đoàn Luật sư địa phương: nhân sự, vụ việc đã thực hiện, doanh thu, kiến nghị.',
    legal_basis: 'Điều 41 Luật Luật sư 65/2006/QH11 (sửa đổi 20/2012/QH13); Thông tư 03/2024/TT-BTP về hướng dẫn Luật Luật sư.',
    penalty: 'Không báo cáo: phạt 5-10 triệu (tổ chức) theo Nghị định 82/2020/NĐ-CP về XPHC trong lĩnh vực bổ trợ tư pháp. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp danh sách luật sư đang hành nghề tại tổ chức cuối năm',
      'Tổng hợp số vụ việc đã thực hiện theo loại (tư vấn, tranh tụng, đại diện ngoài tố tụng)',
      'Tổng hợp doanh thu, nghĩa vụ nộp ngân sách',
      'Lập báo cáo theo Mẫu của Thông tư 03/2024/TT-BTP',
      'Gửi Sở Tư pháp + Đoàn Luật sư và lưu bản sao tại tổ chức'
    ]
  },
  {
    title: 'Mua, duy trì bảo hiểm trách nhiệm nghề nghiệp luật sư',
    deadline: '2026-11-30',
    category: 'license',
    scope: 'industry',
    industry: 'dich_vu_pl',
    frequency: 'yearly',
    priority: 'high',
    description: 'Tổ chức hành nghề luật sư phải mua bảo hiểm trách nhiệm nghề nghiệp cho luật sư của tổ chức mình theo quy định. Duy trì hiệu lực liên tục để bảo đảm bồi thường khi luật sư gây thiệt hại trong hành nghề.',
    legal_basis: 'Điều 40 Luật Luật sư 65/2006/QH11 (sửa đổi 20/2012/QH13); Thông tư 17/2011/TT-BTP về hướng dẫn bảo hiểm trách nhiệm nghề nghiệp luật sư.',
    penalty: 'Không mua/duy trì BHTNNN: phạt 5-10 triệu (tổ chức) theo Nghị định 82/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Rà soát hợp đồng BHTNNN hiện hữu và hạn hiệu lực',
      'Chọn DN bảo hiểm có sản phẩm BHTNNN luật sư phù hợp (mức TNDS, phạm vi loại trừ)',
      'Ký hợp đồng và đóng phí bảo hiểm trước khi HĐ cũ hết hạn',
      'Thông báo danh sách luật sư được bảo hiểm cho DN bảo hiểm khi có biến động',
      'Lưu hợp đồng và chứng từ đóng phí trong hồ sơ pháp lý tổ chức'
    ]
  },
  {
    title: 'Cập nhật danh sách luật sư hành nghề tại Đoàn Luật sư',
    deadline: '2026-09-30',
    category: 'license',
    scope: 'industry',
    industry: 'dich_vu_pl',
    frequency: 'once',
    priority: 'medium',
    description: 'Khi có biến động (luật sư mới gia nhập/rời tổ chức, chuyển Đoàn LS, thay đổi nội dung CCHN), tổ chức hành nghề luật sư phải cập nhật danh sách với Đoàn Luật sư và Sở Tư pháp trong thời hạn quy định.',
    legal_basis: 'Điều 23, 24 Luật Luật sư 65/2006/QH11 (sửa đổi 20/2012/QH13); Điều lệ Đoàn Luật sư địa phương.',
    penalty: 'Không thông báo biến động hoặc cập nhật chậm: phạt 1-3 triệu (cá nhân) hoặc gấp 2 lần (tổ chức) theo Nghị định 82/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Tổng hợp danh sách luật sư có biến động trong kỳ',
      'Cập nhật hồ sơ luật sư: quyết định bổ nhiệm, hợp đồng lao động, CCHN còn hiệu lực',
      'Gửi văn bản thông báo cho Đoàn Luật sư trong vòng 07 ngày kể từ khi có biến động',
      'Đồng thời gửi Sở Tư pháp đối với thay đổi nội dung đăng ký hoạt động',
      'Cập nhật vào sổ theo dõi luật sư tại tổ chức'
    ]
  }
];

// ── Lô 2: Sự kiện pháp lý — Luật/NĐ có hiệu lực trong H2/2026 ─────────────
// Mỗi mục có nguồn chính thống (thuvienphapluat.vn / chinhphu.vn / luatvietnam).
// applies_to để mặc định 'business' khớp pattern các seed khác.
const LEGAL_MILESTONES = [
  {
    title: '⚖️ Luật Quản lý thuế 108/2025/QH15 có hiệu lực từ 01/7/2026',
    deadline: '2026-07-01',
    category: 'tax',
    scope: 'general',
    industry: null,
    frequency: 'once',
    priority: 'high',
    description: 'Luật Quản lý thuế số 108/2025/QH15 chính thức có hiệu lực từ 01/7/2026 (riêng Điều 13 và Điều 26 về khai/khấu trừ/HĐĐT cho hộ kinh doanh, cá nhân kinh doanh áp dụng từ 01/1/2026). Trọng tâm: chuyển sang quản lý thuế dựa trên dữ liệu và rủi ro, siết quản lý TMĐT/nền tảng số, mở rộng đối tượng người nộp thuế ở nước ngoài, tăng tự động hoá.',
    legal_basis: 'Luật Quản lý thuế số 108/2025/QH15 do Quốc hội khóa XV thông qua; thay thế Luật QLT 38/2019/QH14.',
    penalty: 'Vi phạm sau ngày hiệu lực sẽ bị xử lý theo Luật mới và các văn bản hướng dẫn (Nghị định 125/2020/NĐ-CP sửa đổi và Nghị định/Thông tư thay thế). Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Đối chiếu sự khác biệt giữa Luật QLT 108/2025 và Luật QLT 38/2019 — cập nhật quy trình kế toán, khai thuế nội bộ',
      'Rà soát phần mềm khai thuế (HTKK, eTax) và đảm bảo cập nhật phiên bản hỗ trợ Luật mới',
      'Đào tạo nhân sự kế toán/thuế về các thay đổi: phân nhóm rủi ro, thanh tra điện tử, nghĩa vụ với TMĐT/nền tảng số',
      'Đối với DN có hoạt động TMĐT, nền tảng số: rà soát nghĩa vụ kê khai/khấu trừ thuế cho nhà cung cấp nước ngoài',
      'Theo dõi Nghị định, Thông tư hướng dẫn thi hành Luật QLT 108/2025 do Bộ Tài chính ban hành'
    ],
    source: 'thuvienphapluat.vn',
    source_url: 'https://thuvienphapluat.vn/phap-luat/toan-van-luat-quan-ly-thue-2025-luat-so-1082025qh15-co-hieu-luc-tu-172026-chi-tiet-ra-sao-246790.html'
  },
  {
    title: '⚖️ Luật Thuế thu nhập cá nhân 109/2025/QH15 có hiệu lực từ 01/7/2026',
    deadline: '2026-07-01',
    category: 'tax',
    scope: 'general',
    industry: null,
    frequency: 'once',
    priority: 'high',
    description: 'Luật Thuế TNCN số 109/2025/QH15 có hiệu lực 01/7/2026, thay thế Luật TNCN 04/2007/QH12. Thay đổi lớn: mức giảm trừ gia cảnh cho người nộp thuế nâng lên 15,5 triệu đồng/tháng, mỗi người phụ thuộc 6,2 triệu đồng/tháng; biểu thuế lũy tiến từng phần giảm từ 7 bậc còn 5 bậc (5%, 10%, 20%, 30%, 35%); doanh thu không chịu thuế của hộ KD, cá nhân KD nâng lên 500 triệu đồng/năm. Một số quy định áp dụng từ kỳ tính thuế 2026.',
    legal_basis: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15 do Quốc hội khóa XV thông qua; thay thế Luật TNCN 04/2007/QH12 và các luật sửa đổi 26/2012/QH13, 71/2014/QH13.',
    penalty: 'Vi phạm khai/nộp thuế TNCN sau ngày hiệu lực bị xử lý theo Luật QLT 108/2025 và Nghị định xử phạt thay thế NĐ 125/2020/NĐ-CP. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Cập nhật phần mềm tính lương/khấu trừ TNCN với biểu thuế 5 bậc và mức giảm trừ mới',
      'Thông báo cho người lao động đăng ký lại giảm trừ gia cảnh cho người phụ thuộc (nếu cần)',
      'Đối với hộ KD, cá nhân KD: rà soát ngưỡng doanh thu 500 triệu/năm để xác định nghĩa vụ thuế',
      'Đào tạo bộ phận C&B / kế toán tiền lương về cách tính mới và các khoản miễn thuế bổ sung',
      'Theo dõi Nghị định, Thông tư hướng dẫn của Bộ Tài chính và cập nhật quy trình quyết toán TNCN cho kỳ 2026'
    ],
    source: 'thuvienphapluat.vn',
    source_url: 'https://thuvienphapluat.vn/phap-luat/bieu-thue-tncn-2026-ap-dung-tu-11-hay-17-bieu-thue-luy-tien-tung-phan-giam-tu-7-bac-xuong-con-5-bac-245954.html'
  },
  {
    title: '⚖️ Hợp đồng lao động điện tử chính thức vận hành từ 01/7/2026',
    deadline: '2026-07-01',
    category: 'labor',
    scope: 'general',
    industry: null,
    frequency: 'once',
    priority: 'high',
    description: 'Theo Nghị định 337/2025/NĐ-CP (có hiệu lực 01/1/2026), việc ký kết và thực hiện hợp đồng lao động điện tử chính thức áp dụng từ 01/7/2026. Đến mốc này, nền tảng HĐLĐ điện tử phải đi vào hoạt động; HĐLĐ điện tử có giá trị tương đương HĐLĐ giấy, có dấu thời gian số và xác thực bởi nhà cung cấp dịch vụ.',
    legal_basis: 'Nghị định 337/2025/NĐ-CP về hợp đồng lao động điện tử (hiệu lực 01/1/2026; áp dụng đầy đủ từ 01/7/2026); Bộ luật Lao động 45/2019/QH14; Luật Giao dịch điện tử 20/2023/QH15.',
    penalty: 'Vi phạm về ký kết HĐLĐ (kể cả điện tử) bị xử lý theo Nghị định 12/2022/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực lao động. Xem chi tiết tại văn bản được trích dẫn.',
    steps: [
      'Lựa chọn nhà cung cấp nền tảng HĐLĐ điện tử (eContract) đáp ứng yêu cầu kỹ thuật và pháp lý',
      'Bảo đảm chữ ký số có dấu thời gian (timestamp) cho cả người sử dụng lao động và người lao động',
      'Xây dựng quy trình nội bộ về ký kết, lưu trữ, sửa đổi, chấm dứt HĐLĐ điện tử',
      'Đào tạo bộ phận nhân sự và cập nhật mẫu HĐLĐ phù hợp với định dạng điện tử',
      'Bảo đảm tuân thủ Luật Bảo vệ DLCN 91/2025/QH15 khi xử lý dữ liệu lao động trong nền tảng HĐLĐ điện tử'
    ],
    source: 'baochinhphu.vn',
    source_url: 'https://baochinhphu.vn/quy-dinh-ve-hop-dong-lao-dong-dien-tu-102251224163230005.htm'
  }
];

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

  // ── Phần 2: INSERT các nghĩa vụ chung CÒN THIẾU (Lô 1) + Sự kiện pháp lý (Lô 2) ──
  const allInserts = [
    ...NEW_INSERTS.map(e => ({ ...e, _batch: 'lo1_general' })),
    ...LEGAL_MILESTONES.map(e => ({ ...e, _batch: 'lo2_legal_milestone', applies_to: 'all' })),
    ...INDUSTRY_FNB_YTE.map(e => ({ ...e, _batch: 'lo3_fnb_yte' })),
    ...INDUSTRY_XAYDUNG_BDS.map(e => ({ ...e, _batch: 'lo4_xaydung_bds' })),
    ...INDUSTRY_XNK_LOGISTIC.map(e => ({ ...e, _batch: 'lo5_xnk_logistic' })),
    ...INDUSTRY_SANXUAT_NANGLUONG.map(e => ({ ...e, _batch: 'lo6_sx_nl' })),
    ...INDUSTRY_IT_TC_DVPL.map(e => ({ ...e, _batch: 'lo7_it_tc_dvpl' }))
  ];

  let inserted = 0;
  let skippedExisting = 0;
  const insertErrors = [];
  const insertedDetail = { lo1_general: 0, lo2_legal_milestone: 0 };

  for (const ev of allInserts) {
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
      insertedDetail[ev._batch] = (insertedDetail[ev._batch] || 0) + 1;
    } catch (err) {
      insertErrors.push({ batch: ev._batch, title: ev.title, deadline: ev.deadline, error: err.message });
      if (log) log('ERROR', 'New insert H2 2026 failed', { batch: ev._batch, title: ev.title, deadline: ev.deadline, error: err.message });
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
      total_entries: allInserts.length,
      inserted,
      skipped_existing: skippedExisting,
      by_batch: insertedDetail,
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

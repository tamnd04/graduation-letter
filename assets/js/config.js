/* ==========================================================================
   CẤU HÌNH THIỆP MỜI
   Thông tin cá nhân (tên, email) KHÔNG để ở đây mà để trong assets/js/config.local.js
   (đã có trong .gitignore) — xem README.
   ========================================================================== */
window.INVITE = {
  /* Thông tin tân khoa — tên được ghi đè trong config.local.js */
  graduate: {
    name: "",                  // ví dụ: "Nguyễn Văn A"
    shortName: "",             // ví dụ: "A" — dùng trong câu "Gửi cho A", "Đã báo cho A"
    title: "Tân Cử nhân",      // "Tân Cử nhân", "Tân Thạc sĩ", "Tân Kỹ sư", ...
  },

  /* Người nhận mặc định — có thể cá nhân hoá bằng link: index.html?to=Tên%20người%20nhận */
  defaultGuest: "Bạn thân mến",

  /* Giờ hẹn gặp (đếm ngược + lịch) và giờ kết thúc sự kiện trong lịch — giờ Việt Nam */
  arrival: "2026-11-29T09:45:00+07:00",
  end: "2026-11-29T10:45:00+07:00",
  meetNote: "chụp ảnh lưu niệm sau lễ trao bằng",   // khách đến để làm gì lúc giờ hẹn

  /* Nhóm lễ của bạn trong chương trình (1, 2 hoặc 3) — được đánh dấu "Buổi lễ của mình" */
  session: 1,

  venue: {
    hall: "Hội trường A5",
    school: "Trường Đại học Bách khoa – ĐHQG-HCM",
    address: "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh",
    a5: [10.773348, 106.659644],          // toạ độ tòa A5
    mainGate: [10.772157, 106.658016],    // cổng chính 268 Lý Thường Kiệt
    thtGate: [10.772808, 106.660596],     // cổng Tô Hiến Thành
  },

  /* Nút "Mình sẽ đến!" — gửi xác nhận tham dự về email qua FormSubmit (miễn phí, không cần tài khoản).
     Lần gửi đầu tiên FormSubmit sẽ gửi mail "Activate Form" — bấm kích hoạt một lần là xong.
     Sau khi kích hoạt, FormSubmit gửi cho bạn một chuỗi ngẫu nhiên: dán vào "endpoint" để ẩn email khỏi mã nguồn. */
  rsvp: {
    email: "",       // email nhận xác nhận — đặt trong config.local.js
    endpoint: "",    // ví dụ: "a1b2c3d4e5f6..." (chuỗi FormSubmit gửi sau khi kích hoạt) — để trống thì dùng email
  },

  /* Liên hệ (tuỳ chọn — để trống sẽ tự ẩn nút) */
  contact: {
    phone: "",       // ví dụ: "0901234567"
    messenger: "",   // ví dụ: "https://m.me/ten.cua.ban"
    zalo: "",        // ví dụ: "https://zalo.me/0901234567"
  },

  virtualTour: "https://hcmut.edu.vn/virtual-tour/",
};

/* Thư viện three.js (dùng chung cho nền hạt & bản đồ 3D) */
window.THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

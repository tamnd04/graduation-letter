# Thư mời Lễ Tốt Nghiệp · 29.11.2026

Website thiệp mời (đen – vàng) cho lễ tốt nghiệp tại Hội trường A5, Trường Đại học Bách khoa – ĐHQG-HCM.
Xem được trên cả máy tính và điện thoại. Không cần cài đặt hay build gì: chỉ là HTML/CSS/JS tĩnh.

**Bản đang chạy:** https://graduation-letter-tam.vercel.app

## 1. Cấu hình

Cấu hình chia làm hai file:

- `assets/js/config.js`: giờ hẹn, nhóm lễ, địa điểm… Có trong repo.
- `assets/js/config.local.js`: **thông tin cá nhân** (tên, email nhận xác nhận). File này nằm trong `.gitignore`
  nên không bao giờ được đưa lên GitHub, nhưng vẫn được deploy lên Vercel từ máy của bạn.
  Không có file này thì trang vẫn chạy, chỉ là không hiện tên và nút xác nhận chỉ bắn pháo hoa.

Tạo `assets/js/config.local.js` như sau:

```js
(function (I) {
  I.graduate = Object.assign(I.graduate || {}, { name: "Nguyễn Văn A", shortName: "A" });
  I.rsvp = Object.assign(I.rsvp || {}, { email: "ban@example.com", endpoint: "" });
})(window.INVITE = window.INVITE || {});
```

| Mục trong `config.js` | Ý nghĩa |
|---|---|
| `graduate.title` | “Tân Cử nhân”, “Tân Thạc sĩ”, “Tân Kỹ sư”… |
| `arrival` / `end` | Giờ hẹn (đếm ngược + lịch) và giờ kết thúc sự kiện trong lịch. |
| `meetNote` | Khách đến để làm gì lúc giờ hẹn, ví dụ “chụp ảnh lưu niệm sau lễ trao bằng”. |
| `session` | Nhóm lễ (1, 2 hoặc 3). Mục trong chương trình chứa giờ hẹn tự được gắn nhãn “Hẹn gặp bạn”. |
| `contact` | Số điện thoại / Messenger / Zalo (tuỳ chọn). Để trống thì nút tự ẩn. |

## 2. Email xác nhận tham dự (làm một lần)

Khi khách bấm **“Mình sẽ đến!”**, họ điền tên, số người đi cùng và lời nhắn. Thông tin được gửi về email
trong `config.local.js` qua [FormSubmit](https://formsubmit.co) (miễn phí, không cần tài khoản).

1. Đưa web lên mạng (mục 5). FormSubmit **không chạy** khi mở `index.html` trực tiếp từ máy.
2. Mở trang web, bấm “Mình sẽ đến!” và gửi thử một lần.
3. Mở thư “Activate Form” của FormSubmit trong hộp thư của bạn (xem cả mục Spam) và bấm kích hoạt.
4. (Nên làm) FormSubmit sẽ gửi một chuỗi ngẫu nhiên: dán vào `rsvp.endpoint` để email không nằm trong mã nguồn của trang.

Nếu gửi tự động bị lỗi, hộp thoại sẽ hiện nút **“Gửi bằng ứng dụng email”** để khách gửi thư soạn sẵn.

## 3. Thiệp riêng cho từng người

Thêm `?to=Tên` vào cuối đường dẫn, ví dụ `https://ten-mien-cua-ban/?to=Ông%20Bà%20Nội`.
Thiệp sẽ hiện “Gửi Ông Bà Nội” trên phong bì và “Trân trọng kính mời Ông Bà Nội” ở trang chính.
Nút **“Tạo thiệp mời riêng cho từng người”** ở cuối trang giúp tạo và sao chép link.

## 4. Xem thử trên máy

Mở thẳng `index.html` bằng trình duyệt (cần internet để tải font, thư viện 3D và bản đồ).

## 5. Đưa lên mạng

Từ thư mục này (đã liên kết với project Vercel `graduation-letter`):

```
vercel deploy --prod
```

`config.local.js` được deploy cùng vì Vercel CLI tải lên từ máy của bạn. Nếu sau này bật tự động deploy
từ GitHub, file đó sẽ không có trên GitHub nên cần chuyển tên/email sang biến môi trường hoặc cách khác.

Sau khi có tên miền, sửa `og:url` và `og:image` trong `index.html` thành đường dẫn đầy đủ để
Messenger/Zalo/Facebook hiện ảnh xem trước.

## Cấu trúc

```
index.html                Nội dung trang
assets/css/style.css      Giao diện, hiệu ứng, responsive
assets/js/config.js       Cấu hình chung
assets/js/config.local.js Thông tin cá nhân (không có trong repo)
assets/js/main.js         Phong bì, đếm ngược, lịch, chương trình, xác nhận tham dự, hiệu ứng cuộn
assets/js/background.js   Nền hạt WebGL đổi hình theo từng phần khi cuộn
assets/js/map3d.js        Bản đồ 3D khuôn viên, lộ trình đến Hội trường A5
assets/js/campus-data.js  Dữ liệu toà nhà/đường (từ OpenStreetMap)
assets/og.jpg             Ảnh xem trước khi chia sẻ link
```

## Ghi chú

- Bản đồ 3D dựng từ dữ liệu © OpenStreetMap contributors (ODbL), chỉ mang tính minh hoạ: chiều cao toà nhà là ước lượng.
- Chương trình buổi lễ theo thư mời chính thức của Trường Đại học Bách khoa – ĐHQG-HCM.
- Thư viện dùng qua CDN: three.js, GSAP + ScrollTrigger, Lenis, canvas-confetti, Google Fonts.

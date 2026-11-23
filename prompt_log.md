# NHẬT KÝ SỬ DỤNG AI (PROMPT LOG)

> **Dự án:** Hệ thống giám sát điện năng (hethonggiamsatdiennang.vn)  
> **Học phần:** Thiết kế & Lập trình Web Frontend  
> **Nhóm:** Hưng, Tuấn Anh, Sơn, Nam, Uy  
> **Thời gian thực hiện:** Tháng 10 – 11/2026

---

## 1. Tổng quan ứng dụng AI trong dự án

Nhóm đã sử dụng AI (ChatGPT, GitHub Copilot) làm **công cụ hỗ trợ** xuyên suốt quá trình phát triển dự án. AI được dùng với vai trò:

- **Trợ lý viết mã:** Sinh khung HTML/CSS/JS ban đầu, giúp tăng tốc phát triển.
- **Trợ lý sửa lỗi:** Debug JavaScript, sửa lỗi logic tính toán, lỗi responsive.
- **Trợ lý thiết kế:** Gợi ý bảng màu, layout CSS Grid, hiệu ứng animation.
- **Trợ lý tài liệu:** Hỗ trợ viết README, chuẩn hóa cấu trúc thư mục.

**Lưu ý quan trọng:** Toàn bộ kết quả AI sinh ra đều được nhóm **kiểm tra, chỉnh sửa và tùy biến** theo yêu cầu thực tế của dự án. Không có đoạn code nào được sử dụng nguyên trạng mà không qua review.

---

## 2. Các giai đoạn sử dụng AI

### Giai đoạn 1: Khởi tạo dự án & Thiết kế giao diện (Tuần 1–2)

| Ngày | Thành viên | Prompt đã dùng | Kết quả | Đánh giá |
|------|-----------|-----------------|---------|----------|
| 01/10 | Hưng | "Thiết kế dashboard giám sát điện năng smart home, phong cách tối xanh (dark navy), sử dụng CSS Grid, hiển thị công suất tức thời, kWh tích lũy, tiền điện theo bậc thang EVN 6 bậc" | Sinh khung HTML với layout 2 cột, 4 thẻ metric KPI, placeholder cho sơ đồ phòng | Tốt – Khung cơ bản hợp lý, nhóm chỉnh sửa thêm animation và hiệu ứng |
| 03/10 | Hưng | "Tạo bảng màu CSS variables cho giao diện dashboard tối hiện đại: màu nền #0b1120, card #151f32, primary sky-400, success emerald-500, warning amber-500, danger rose-500" | Sinh block `:root` với đầy đủ CSS custom properties, kèm shadow và transition variables | Tốt – Nhóm bổ sung thêm `--primary-glow`, `--spring-bounce` và các biến radius |
| 05/10 | Hưng | "Viết CSS animation cho icon thiết bị khi bật: quạt quay tròn, đèn phát sáng vàng, điều hòa tuyết quay chậm, máy giặt rung nhẹ" | Sinh 4 `@keyframes`: `spin-fast`, `spin-slow`, `light-glow`, `washer-shake` | Tốt – Dùng nguyên, bổ sung `cubic-bezier` cho toggle switch |

### Giai đoạn 2: Xây dựng logic nghiệp vụ (Tuần 3–4)

| Ngày | Thành viên | Prompt đã dùng | Kết quả | Đánh giá |
|------|-----------|-----------------|---------|----------|
| 10/10 | Hưng | "Viết module JavaScript tính tiền điện theo biểu giá bậc thang 6 bậc EVN, dùng map/reduce, có VAT 8%, trả về breakdown chi tiết từng bậc" | Sinh `EnergyCalculator.calculateTieredBill()` với logic duyệt bậc chính xác | Tốt – Logic đúng, nhóm thêm field `active` và format VNĐ |
| 12/10 | Hưng | "Viết engine mô phỏng realtime 1 giây, công suất dao động ±3%, tích lũy kWh = Watts × seconds × speedMultiplier / 3600000, có đèn LED xung công tơ chớp nháy" | Sinh vòng `setInterval` với logic tích lũy kWh và impulse LED flash | Khá – Nhóm chỉnh sửa logic reset, thêm speed selector UI |
| 14/10 | Tuấn Anh | "Làm trang đăng nhập cho hệ thống giám sát điện năng, cùng phong cách tối xanh với dashboard, có kiểm tra form rỗng/sai email/mật khẩu ngắn, hiện ẩn mật khẩu, responsive" | Sinh login.html + login.css + login.js: layout 2 cột, validate realtime, toggle password | Tốt – Nhóm bổ sung khóa 30s khi sai 5 lần, Caps Lock warning, toast notification |
| 16/10 | Tuấn Anh | "Thêm localStorage/sessionStorage ghi nhớ đăng nhập, bọc try/catch cho môi trường chặn storage, chuyển hướng index.html nếu đã login" | Sinh hàm `safeGet/safeSet/safeDel` + redirect logic + checkbox Remember me | Tốt – An toàn khi trình duyệt chặn localStorage |

### Giai đoạn 3: Trang thống kê & AI Advisor (Tuần 5–6)

| Ngày | Thành viên | Prompt đã dùng | Kết quả | Đánh giá |
|------|-----------|-----------------|---------|----------|
| 20/10 | Sơn | "Tạo trang thống kê điện năng chi tiết với Chart.js: biểu đồ đường 3 chế độ (giờ/ngày/tuần), biểu đồ tròn Doughnut theo phòng, bảng thiết bị sắp xếp theo kWh giảm dần" | Sinh statistics.html + statistics.css + statistics.js, 4 KPI cards, Line Chart + Doughnut Chart, bảng responsive | Tốt – Nhóm bổ sung dữ liệu mô phỏng, custom tooltip, tìm kiếm/lọc bảng |
| 22/10 | Sơn | "Viết CSS cho bảng thống kê thiết bị: rank badge vàng/bạc/đồng cho top 3, mini progress bar theo tỷ lệ %, trạng thái bật/tắt với dot nhấp nháy" | Sinh CSS `.rank-badge.rank-1/2/3`, `.share-progress-bar.tier-high/mid/low`, `.status-dot-blink` | Tốt – Dùng gradient và box-shadow đẹp |
| 25/10 | Uy | "Viết module AI advisor rule-based chạy trên trình duyệt: lấy thời tiết từ API mở Open-Meteo (không cần key), phân tích thiết bị tốn điện nhất, gợi ý tắt điều hòa khi ngoài trời mát, cảnh báo thiết bị công suất cao" | Sinh `ai-advisor.js` với `loadWeather()`, `snapshot()`, `buildTips()`, `render()` | Tốt – Logic phân tích hợp lý, xử lý lỗi mạng, dùng `textContent` tránh XSS |

### Giai đoạn 4: Profile & Hoàn thiện (Tuần 7–8)

| Ngày | Thành viên | Prompt đã dùng | Kết quả | Đánh giá |
|------|-----------|-----------------|---------|----------|
| 01/11 | Nam | "Tạo trang hồ sơ cá nhân (profile.html) cho hệ thống giám sát điện năng: layout sidebar + main content, form chỉnh sửa thông tin, avatar upload, chế độ sáng/tối, lưu localStorage theo tài khoản đăng nhập" | Sinh profile.html với sidebar navigation, profile cover, form 7 trường, avatar upload FileReader, theme toggle, toast notification | Tốt – Giao diện chuyên nghiệp, responsive 3 breakpoints |
| 03/11 | Nam | "Thêm validate form profile: họ tên ≥ 2 ký tự, email regex, SĐT 10 số đầu 0 hoặc +84, hiển thị lỗi riêng từng ô, nút Hủy quay về dữ liệu cũ" | Sinh `validateForm()` với 3 regex, `setEditing()` toggle disabled, `cancelEdit()` restore original | Tốt – UX tốt, có error message riêng từng field |
| 10/11 | Uy | "Viết tài liệu README.md cho dự án web giám sát điện năng: giới thiệu, tính năng, cấu trúc thư mục, hướng dẫn chạy, phân công nhóm, prompt AI tiêu biểu" | Sinh README.md chuẩn GitHub với Markdown heading, bảng phân công, code block | Tốt – Nhóm chỉnh sửa thêm phần login và AI integration |

---

## 3. Bảng tổng hợp Prompt AI tiêu biểu

| # | Prompt | Mục đích | File liên quan | Kết quả chính |
|---|--------|----------|----------------|---------------|
| 1 | "Thiết kế dashboard giám sát điện năng smart home, CSS Grid, dark theme xanh navy" | Tạo khung giao diện chính | index.html, style.css | Layout 2 cột responsive, 4 KPI cards |
| 2 | "Viết module tính tiền điện bậc thang 6 bậc EVN, dùng map/reduce, VAT 8%" | Logic tính toán điện | calculator.js | Hàm `calculateTieredBill()` chính xác |
| 3 | "Làm trang đăng nhập, validate form, hiện ẩn mật khẩu, khóa khi sai nhiều lần" | Trang login | login.html/css/js | Form bảo mật, responsive |
| 4 | "Module AI advisor rule-based, gọi API Open-Meteo, phân tích thiết bị tốn điện" | Tích hợp AI | ai-advisor.js | Gợi ý tiết kiệm thông minh |
| 5 | "Trang thống kê Chart.js: biểu đồ đường 3 chế độ, Doughnut theo phòng, bảng thiết bị" | Trang thống kê | statistics.html/css/js | Dashboard phân tích hoàn chỉnh |

---

## 4. Cách nhóm kiểm tra kết quả AI

Nhóm áp dụng quy trình kiểm tra 4 bước:

1. **Code Review:** Đọc hiểu toàn bộ code AI sinh ra trước khi sử dụng. Kiểm tra logic, tên biến, cấu trúc.
2. **Test trình duyệt:** Mở trên Chrome DevTools, kiểm tra Console không có lỗi, Network không 404, Elements hiển thị đúng.
3. **Test responsive:** Kiểm tra trên viewport mobile (375px), tablet (768px), desktop (1440px).
4. **Cross-review:** Thành viên khác trong nhóm review code trước khi tích hợp vào dự án chung.

---

## 5. Những lỗi AI tạo ra và cách khắc phục

| # | Lỗi AI sinh ra | File | Cách khắc phục |
|---|----------------|------|----------------|
| 1 | AI sinh layout CSS dùng `float` thay vì CSS Grid như yêu cầu đề bài | style.css | Viết lại hoàn toàn bằng `display: grid` và `grid-template-columns` |
| 2 | Hàm tính tiền điện ban đầu tính sai bậc 6 (khi `to: Infinity` thì `tierCapacity` bị NaN) | calculator.js | Thêm điều kiện `tierConfig.to === Infinity ? Infinity : (to - from + 1)` |
| 3 | AI quên bọc `localStorage` trong `try/catch`, crash khi trình duyệt chặn storage | login.js | Tạo hàm wrapper `safeGet/safeSet/safeDel` bọc tất cả lệnh storage |
| 4 | AI dùng `innerHTML` để render gợi ý AI, có nguy cơ XSS | ai-advisor.js | Chuyển sang `textContent` + `document.createElement()` + `replaceChildren()` |
| 5 | Biểu đồ Chart.js tooltip hiển thị tiếng Anh, không phù hợp giao diện tiếng Việt | statistics.js | Custom `callbacks.label` để hiển thị "Tiêu thụ: X kWh" và "Chi phí ước tính: X đ" |
| 6 | CSS animation cánh quạt bị giật khi render lại DOM mỗi giây | app.js | Tách `updateDevicePowersOnly()` chỉ cập nhật text, không rebuild toàn bộ HTML |
| 7 | Trang profile AI sinh CSS inline dài trong `<style>`, không tách file riêng | profile.html | Giữ nguyên do trang profile là module độc lập, CSS không xung đột |

---

## 6. Bài học kinh nghiệm

### 6.1. AI là công cụ hỗ trợ, không thay thế lập trình viên
- AI giúp tăng tốc viết code boilerplate nhưng **luôn cần review và chỉnh sửa**.
- AI đôi khi sinh code "nhìn đúng nhưng sai logic" (ví dụ: tính bậc thang Infinity).

### 6.2. Prompt càng chi tiết, kết quả càng tốt
- Prompt mô tả rõ phong cách giao diện (dark navy, sky-400), công nghệ (CSS Grid, ES6+), và nghiệp vụ (biểu giá EVN 6 bậc) cho kết quả chính xác hơn.
- Prompt ngắn gọn kiểu "làm trang login" cho kết quả generic, phải chỉnh nhiều.

### 6.3. Phải hiểu code trước khi dùng
- Nếu không hiểu code AI sinh ra, không thể debug khi có lỗi.
- Nhóm quy định: **ai sử dụng prompt phải giải thích được code cho nhóm**.

### 6.4. AI không thể thay thế thiết kế UX
- AI tạo layout cơ bản nhưng không tối ưu trải nghiệm người dùng.
- Các hiệu ứng micro-animation (spring bounce, impulse LED, shimmer) đều do nhóm tự thiết kế.

### 6.5. Quản lý version khi dùng AI
- Code AI sinh ra phải commit riêng với tag `[AI-Assisted]` để phân biệt.
- Nhóm dùng branch `feature/*` cho từng thành viên, merge vào `main` sau khi review.

# HỆ THỐNG GIÁM SÁT ĐIỆN NĂNG (hethonggiamsatdiennang.vn)
> Đồ án nhóm chuyên đề Frontend Web: HTML5, CSS Grid & JavaScript ES6+ (Chuẩn Rubric Giỏi 90 - 100%)

---

## 1. Giới thiệu dự án
Phân hệ **Hệ thống giám sát điện năng** (`hethonggiamsatdiennang.vn`) mô phỏng một trạm điều khiển nhà thông minh (Smart Home IoT Dashboard), kết nối công tơ điện tử thông minh, tự động đo đạc điện năng thời gian thực và tính toán hóa đơn tiền điện theo đúng **Biểu giá bán lẻ điện sinh hoạt 6 bậc của EVN**.

---

## 2. Tính năng & Kỹ thuật nổi bật (Cập nhật phiên bản Realtime Engine)

### 2.1. Số liệu chạy thời gian thực (Realtime Ticker Engine)
- **Chu kỳ cập nhật 1 giây (1000ms)**: Điện năng tiêu thụ tích lũy (`kWh`) hiển thị với **độ chính xác 3 chữ số thập phân** (ví dụ: `125.438 kWh`) nhảy số tăng dần liên tục trước mắt người xem.
- **Tiền điện phát sinh thời gian thực (VNĐ)**: Tiền điện thực tế tự động tính toán lũy tiến theo từng đồng dựa trên bậc thang EVN và thuế VAT 8%.
- **Bộ điều chỉnh tốc độ demo linh hoạt**:
  - `1x`: Thời gian thực tế.
  - `10x`: Tăng tốc 10 lần.
  - `60x` *(Mặc định khi thuyết trình)*: 1 giây trên màn hình = 1 phút tiêu thụ thực tế, giúp ban giám khảo/giảng viên thấy rõ số tiền và kWh nhảy liên tục.
  - `360x`: Siêu tốc demo các bậc thang 4, 5, 6.
- **Đèn LED xung công tơ điện tử (`impulse-led`)**: Chớp nháy màu đỏ theo tần suất tiêu thụ công suất thực tế mô phỏng công tơ EVN 1600 imp/kWh.
- **Đồng hồ hệ thống thời gian thực**: Hiển thị chính xác `HH:mm:ss` đồng bộ hệ thống.

### 2.2. Chức năng Reset tiền điện chu kỳ
- Nút **"Reset tiền điện"** trên thanh công cụ:
  - Cho phép người dùng hoặc người thuyết trình đưa toàn bộ số điện `0.000 kWh` và tiền điện về `0 đ` chỉ với 1 cú click.
  - Tự động reset bảng 6 bậc thang EVN về mức khởi điểm.
  - Kèm âm thanh thông báo và **Toast notification** nổi góc màn hình.

### 2.3. Hiệu ứng Micro-animations & Âm thanh phản hồi xúc giác (Haptic Sound)
- **Nút Toggle Switch**: Hiệu ứng đàn hồi nảy nhẹ `cubic-bezier(0.34, 1.56, 0.64, 1)` cùng viền phát sáng emerald glow.
- **Âm thanh click chân thực (Web Audio API)**: Tích hợp âm thanh pop/click tổng hợp tần số cao/thấp khi gạt bật/tắt thiết bị hoặc bấm nút Reset (không phụ thuộc file âm thanh ngoài).
- **Hoạt ảnh thiết bị hoạt động**:
  - ❄️ Điều hòa: biểu tượng tuyết quay êm dịu.
  - 🌀 Quạt trần: cánh quạt quay tròn liên tục.
  - 💡 Đèn LED: phát sáng vàng ấm (`text-shadow glow`).
  - 🫧 Máy giặt: rung nhẹ chu trình giặt.
  - ⚡ Bậc thang EVN: dải ánh sáng trượt ngang `shimmer effect`.

### 2.4. Phân hệ Thống kê chi tiết Đa chu kỳ & Đồng bộ Thời gian thực (Mới nâng cấp)
- **Đồng bộ hóa toàn diện hai chiều (EnergyDataStore)**:
  - Đồng bộ tức thì giữa Dashboard (`index.html`) và Trang Thống kê (`statistics.html`) thông qua `localStorage` và `StorageEvent`.
  - Khi bật/tắt thiết bị hay bấm "Reset tiền điện" ở Dashboard, Trang Thống kê lập tức cập nhật lại số liệu.
  - Khi người dùng ở Trang Thống kê, hệ thống tiếp tục đo đếm và tích lũy điện năng thời gian thực từng giây.
- **Thống kê đa chu kỳ theo Phút - Ngày - Tháng - Năm**:
  - **Theo phút (Realtime Load)**: Đo đếm và hiển thị phụ tải điện cùng chi phí ước tính theo từng phút (12 phút gần nhất, phút hiện tại nhảy số realtime).
  - **Theo ngày (Daily Load)**: Sản lượng điện tiêu thụ 7 ngày gần nhất, ngày hôm nay tự động cập nhật liên tục.
  - **Theo tháng (Monthly Consumption)**: Chu kỳ 12 tháng năm 2026, tháng 11 hiện tại đồng bộ với điện năng tiêu thụ thực tế.
  - **Theo năm (Yearly Trend)**: Lũy kế sản lượng và chi phí điện qua các năm (2023 - 2026).
- **Bộ thẻ so sánh trực quan (Period Metric Cards)**:
  - 4 Thẻ hiển thị song song cả **Điện năng tiêu thụ (kWh)** và **Số tiền cần trả (VNĐ)** cho 4 mốc: Phút, Ngày, Tháng, Năm.
  - Bấm trực tiếp vào từng thẻ để chuyển đổi mượt mà biểu đồ Line Chart sang chu kỳ tương ứng.
- **Biểu đồ Chart.js & Bảng thiết bị thời gian thực**:
  - Line Chart: Tooltip hiển thị cả kWh và số tiền quy đổi theo biểu giá EVN. Thanh tóm tắt Peak, Low, Avg tự động tính cho cả kWh và VNĐ.
  - Doughnut Chart: Cập nhật tỷ trọng % và kWh từng phòng theo thời gian thực.
  - Bảng thiết bị: Tự động sắp xếp theo thứ tự tiêu thụ cao xuống thấp, cập nhật công suất tức thời và kWh liên tục mà không làm mất trạng thái tìm kiếm hay lọc phòng.

---

## 3. Cấu trúc thư mục dự án
```text
thi 2/
├── index.html        # Giao diện chính Dashboard, Đồng hồ, Đèn LED & Toast
├── style.css         # CSS Grid, Animation GPU, Ticker, Shimmer & Responsive
├── data.js           # Cấu trúc JSON phòng, thiết bị, biểu giá EVN & EnergyDataStore
├── calculator.js     # Thuật toán tính toán tiền điện bậc thang & dự phóng
├── app.js            # Controller quản lý State, chu kỳ 1s, Web Audio FX & Reset
├── statistics.html   # Giao diện Thống kê chi tiết & Phân tích điện năng
├── statistics.css    # CSS Giao diện Thống kê, thẻ đa chu kỳ & biểu đồ
├── statistics.js     # Realtime Engine trang Thống kê (Phút, Ngày, Tháng, Năm)
├── ai-advisor.js     # Trợ lý AI phân tích thiết bị & thời tiết Open-Meteo
├── login.html        # Giao diện Đăng nhập phân quyền
├── login.css         # CSS Trang Đăng nhập
├── login.js          # Xử lý logic đăng nhập & lưu phiên
└── README.md         # Báo cáo kỹ thuật dự án & phân công nhóm
```

---

## 4. Kịch bản thuyết trình Demo (Pitching - 10%)
1. **Bước 1**: Mở `index.html`, giới thiệu tổng quan giao diện CSS Grid và đèn LED xung công tơ đang nhấp nháy, đồng hồ thời gian thực đang chạy.
2. **Bước 2**: Chỉ cho giảng viên thấy các con số **Điện năng chu kỳ (kWh)** và **Tiền điện thực tế (VNĐ)** đang nhảy số tăng dần từng giây.
3. **Bước 3**: Thử gạt công tắc bật thêm "Bình nước nóng" và "Bếp từ" -> Công suất tức thời tăng vọt, số tiền nhảy nhanh hơn rõ rệt.
4. **Bước 4**: Bấm nút **"Kích hoạt Eco Mode"** -> Hệ thống tự ngắt tải lãng phí, nhận +20 điểm thưởng Eco Points nảy lên sinh động.
5. **Bước 5**: Bấm nút **"Reset tiền điện"** -> Số liệu lập tức trở về 0 để sẵn sàng cho lượt chạy thử tiếp theo.

---

## 5. Trang đăng nhập (phụ trách: Tuấn Anh)
- Files: `login.html`, `login.css`, `login.js`; `index.html` có thêm đoạn chặn truy cập khi chưa đăng nhập và nút **Đăng xuất**.
- Validate form (rỗng, sai định dạng email, mật khẩu < 6 ký tự), hiện/ẩn mật khẩu, cảnh báo Caps Lock, ghi nhớ đăng nhập (`localStorage`/`sessionStorage`), khóa 30 giây nếu sai 5 lần.
- Tài khoản demo: `admin / 123456` hoặc `tuananh / tuananh123`.
- Responsive: ẩn panel giới thiệu và chuyển một cột khi màn hình ≤ 860px.

---

## 6. Ứng dụng AI (AI Integration)

### 6.1. AI hỗ trợ viết mã, sửa lỗi và tối ưu
| Hạng mục | Việc AI đã hỗ trợ | Kết quả |
|---|---|---|
| Trang đăng nhập (`login.html/css/js`) | Sinh khung HTML/CSS/JS theo hệ màu của dashboard | Giao diện 2 cột, responsive |
| Validate form | Sinh hàm kiểm tra rỗng / email / độ dài mật khẩu, hiển thị lỗi từng ô | Báo lỗi rõ ràng, không cần tải lại trang |
| Bảo mật cơ bản | Gợi ý khóa 30 giây khi sai 5 lần, bọc `localStorage` bằng `try/catch` | Không bị lỗi khi trình duyệt chặn lưu trữ |
| Tối ưu giao diện | Chuyển bố cục 1 cột ≤ 860px, tôn trọng `prefers-reduced-motion` | Dùng tốt trên điện thoại |
| Kiểm thử | Chạy trình duyệt tự động: để trống, sai mật khẩu, đăng nhập, đăng xuất, kiểm tra cuộn ngang | Không có lỗi JavaScript |

> Prompt mẫu đã dùng: *"Làm trang đăng nhập cho hệ thống giám sát điện năng, cùng phong cách tối xanh với dashboard, có kiểm tra form, responsive."*
> (Nhóm tự bổ sung các prompt thực tế đã dùng và ảnh trước/sau chỉnh sửa vào đây.)

### 6.2. AI thể hiện trên trang web: "Trợ lý AI gợi ý tiết kiệm"
- File: `ai-advisor.js` (khối hiển thị ở cột phải dashboard).
- **Dữ liệu từ API mở:** gọi Open-Meteo (không cần API key) lấy nhiệt độ và độ ẩm Hà Nội, có nút tải lại và xử lý khi mất mạng.
- **Phân tích:** thiết bị tốn điện nhất, điều hòa so với nhiệt độ ngoài trời, thiết bị công suất lớn, dự báo bậc thang EVN nếu giữ tải hiện tại.
- Gợi ý cập nhật mỗi 2 giây theo công tắc người dùng bật/tắt.
- **Giới hạn:** phần phân tích là bộ luật chạy tại trình duyệt, không phải mô hình ngôn ngữ chạy trực tiếp.

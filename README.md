# 📦 TikTok Shop Manager (Desktop App for Mac & Windows)

Ứng dụng quản lý đơn hàng TikTok Shop chuyên nghiệp chạy trên macOS và Windows, tích hợp:
- **Quét đọc ảnh phiếu in đơn hàng (OCR Offline)** trích xuất tự động mã vận đơn (dãy số to ở trên), ngày đặt hàng, tên sản phẩm, SKU, số lượng, tên người nhận & số điện thoại.
- **Bảo toàn lịch sử giá vốn (Cost Snapshot Engine)**: Đơn hàng cũ không bị ảnh hưởng khi giá vốn hoặc biểu phí sàn thay đổi trong tương lai.
- **Bảng quản lý đơn phong cách Excel**: Tất toán nhanh, nhập giá tất toán trực tiếp (cho phép số âm), ô ghi chú tự do, bộ lọc ngày tháng.
- **Hồ sơ Khách hàng & Đối soát SĐT Thông minh (Phone Pattern Matcher)**: Giải mã SĐT bị che sao `****`, phát hiện trường hợp cùng tên khác số hoặc cùng số khác tên.
- **Đồng bộ Excel hai chiều (Dual-Storage)**: Tự động lưu SQLite nội bộ siêu tốc và đồng bộ ra file Excel `.xlsx` song song.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Chạy trong môi trường Phát Triển (Dev Mode)
Chạy đồng thời Vite Dev Server và Electron:
```bash
npm run dev
```

Hoặc nếu muốn chạy giao diện trực tiếp trên trình duyệt Web (Chrome/Safari):
```bash
npx vite
```
Truy cập `http://localhost:5173`.

---

### 2. Đóng Gói Thành Bộ Cài Ứng Dụng (.dmg / .exe)

#### Cho máy Mac:
```bash
npm run build:mac
```
File cài đặt `.dmg` và ứng dụng `.app` sẽ nằm tại thư mục `release/`.

#### Cho máy Windows:
```bash
npm run build:win
```
File cài đặt `.exe` (NSIS Installer) sẽ nằm tại thư mục `release/`.

---

## 🛠️ Cấu Trúc Dự Án

```
TiktokShopManager/
├── electron/
│   ├── main.js           # Quản lý cửa sổ Electron, IPC & đồng bộ Excel ngầm
│   └── preload.js        # ContextBridge an toàn giao tiếp với React
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Thanh điều hướng và nút thao tác
│   │   ├── StatsCards.jsx       # Thống kê doanh thu, vốn xuất kho & lợi nhuận ròng
│   │   ├── OrderTable.jsx       # Bảng đơn hàng phong cách Excel (Inline edit)
│   │   ├── ProductManager.jsx   # Quản lý giá vốn chi tiết & phí sàn TikTok
│   │   ├── ScanModal.jsx        # Quét nhiều ảnh OCR & bảng review xác nhận
│   │   ├── CustomerModal.jsx    # Đối soát SĐT che sao & hồ sơ khách hàng
│   │   ├── ManualOrderModal.jsx # Tạo đơn hàng thủ công
│   │   └── SettingsModal.jsx    # Cài đặt phí sàn mặc định & vị trí file Excel
│   ├── services/
│   │   ├── dbService.js         # Lưu trữ & cơ chế Cost Snapshot bảo vệ đơn cũ
│   │   ├── ocrService.js        # Tesseract OCR & bóc tách phiếu in TikTok
│   │   ├── phoneMatcher.js      # Thuật toán đối soát SĐT & nhận diện khách
│   │   └── excelService.js      # Tạo và đồng bộ bảng tính Excel (ExcelJS)
│   ├── App.jsx                  # Component gốc điều phối trạng thái
│   └── index.css                # Tailwind CSS
├── tests/
│   └── verify_core_logic.js     # Bộ test tự động kiểm thử toàn diện
└── package.json
```

---

## 🧪 Chạy Kiểm Thử Tự Động (Automated Verification)
Để chạy kiểm thử độc lập cho Snapshot giá vốn, Thuật toán SĐT và Sinh file Excel:
```bash
node tests/verify_core_logic.js
```

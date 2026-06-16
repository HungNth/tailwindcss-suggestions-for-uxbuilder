[Tiếng Việt](README.md) | [English](README-en.md)

# Tailwind CSS IntelliSense for Flatsome UX Builder

Chrome extension cung cấp autocomplete Tailwind CSS v4 trong Flatsome UX Builder (WordPress).

Hoạt động **offline** — các class Tailwind chuẩn được bundle sẵn trong extension, không cần server. Backend chỉ cần khi bạn muốn dùng custom CSS class qua `@apply`.

---

## Cài đặt

```bash
npm install
```

---

## Build

### 1. Generate Tailwind class data

Tạo file JSON chứa toàn bộ Tailwind class (cần chạy trước khi build extension):

```bash
npm run build:tw
```

Output: `ux-build-tw-ext/public/data/tailwind-classes.json`

### 2. Build extension

```bash
cd ux-build-tw-ext
npm run build
```

Output: `ux-build-tw-ext/.output/chrome-mv3/`

### 3. Load extension vào Chrome

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Chọn **Load unpacked** → trỏ tới `ux-build-tw-ext/.output/chrome-mv3/`

---

## Dùng kèm Backend (Custom CSS classes)

Backend chỉ cần thiết nếu bạn có file CSS riêng với `@apply` directives.

### Chạy backend

```bash
cd tw-backend
npm run dev
```

Server chạy tại `http://localhost:3456`.

### Cấu hình trong popup extension

1. Click icon extension khi đang mở UX Builder
2. Nhập đường dẫn tới file CSS của bạn vào ô **CSS File Path**
3. Bấm **Save Configuration**

Extension sẽ tự động nhận custom class từ backend và hiển thị trong autocomplete.

---

## Sử dụng

Mở trang chỉnh sửa UX Builder (`?app=uxbuilder&type=editor`), click vào ô nhập **class name** của bất kỳ element nào — autocomplete sẽ tự hiện ra.

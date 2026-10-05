# VN Landslide AI Monitor

Web tĩnh (HTML/CSS/JS) để tra cứu 34 tỉnh/thành Việt Nam, xem bản đồ địa hình, thời tiết, lượng mưa, độ ẩm đất mô hình và ước tính nguy cơ sạt lở.

## Chạy nhanh

Mở `index.html` bằng web server tĩnh. Ví dụ:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Deploy

Có thể deploy trực tiếp thư mục này lên:
- GitHub Pages
- Vercel
- Netlify
- Railway Static Hosting / Nginx

Không cần API key cho bản demo hiện tại.

## Nguồn dữ liệu
- Open-Meteo Weather Forecast API
- Open-Meteo Elevation API (Copernicus DEM GLO-90)
- OpenStreetMap / OpenTopoMap tiles

## Lưu ý mô hình AI

`AI Risk Engine` hiện là mô hình chấm điểm đa biến thử nghiệm, không phải mô hình học máy đã được huấn luyện/kiểm định bằng dữ liệu sạt lở thực địa. Điểm số kết hợp:
- mưa 24 giờ
- mưa 72 giờ
- cường độ mưa cực đại
- độ ẩm đất mô hình
- độ dốc địa hình ước tính từ DEM

Nếu dùng cho đồ án/nghiên cứu, nên mô tả là **mô hình hỗ trợ đánh giá nguy cơ thử nghiệm**. Để nâng thành mô hình AI thực thụ, có thể bổ sung bộ dữ liệu sạt lở lịch sử và huấn luyện Random Forest/XGBoost/LightGBM, sau đó triển khai API dự đoán riêng.

# NHATANH CHINESE — Trọn bộ game cho GitHub Pages

Bộ này có toàn bộ mã nguồn game: HTML, CSS, JavaScript, logo gốc, font và giấy phép font. Không cần cài thư viện hay chạy lệnh build.

## Đưa lên GitHub Pages

1. Giải nén file `NHATANH-CHINESE-GitHub-Pages.zip`.
2. Tạo hoặc mở repository GitHub dùng cho game.
3. Tải toàn bộ nội dung đã giải nén lên repository, giữ nguyên các thư mục `assets/` và `fonts/`. File `index.html` phải nằm ngay ở thư mục gốc, không nằm trong một thư mục bọc bên ngoài. Tải các file đã giải nén, không chỉ tải file ZIP.
4. Trong **Settings → Pages**, chọn **Deploy from a branch**.
5. Chọn nhánh **main**, thư mục **/(root)**, rồi **Save**. Nếu repository dùng tên nhánh khác, chọn nhánh chứa các file game.
6. Khi GitHub triển khai xong, mở đường dẫn được hiển thị trong mục Pages.

Hướng dẫn chính thức: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Các file

- `index.html`: menu và giao diện game.
- `style.css`: bố cục, màu sắc, font và giao diện cho màn hình nhỏ.
- `game.js`: toàn bộ luật chơi, vẽ cảnh pixel, từ vựng, gợi ý, quản lý bộ từ và nhạc nền.
- `fonts.css`, `fonts/`: font được lưu tại chỗ, kèm giấy phép OFL.
- `assets/logo-nhatanh.png`: logo gốc người dùng cung cấp, có nền trong suốt.
- `.nojekyll`: cho phép GitHub Pages phục vụ trực tiếp các file tĩnh.
- `README.md`: hướng dẫn này.

Mọi đường dẫn tài nguyên đều tương đối, dùng được khi game nằm dưới đường dẫn repository như `https://ten-tai-khoan.github.io/ten-repository/`.

## Chơi thử và chỉnh sửa

Mở `index.html` bằng trình duyệt để chơi trực tiếp. Hoặc chạy máy chủ tĩnh tại thư mục này:

```sh
python3 -m http.server 8765
```

Sau đó mở http://localhost:8765. Nhạc chỉ bắt đầu sau thao tác vào game; có thể tắt ở menu. Gõ đúng không tự đọc từ. Pinyin chỉ hiện khi bấm Gợi ý và tự che lại ở từ tiếp theo.

Muốn thêm, sửa hoặc xóa từ khi chơi: **Menu → Sổ từ vựng**. Danh sách tự chỉnh và điểm được lưu trong trình duyệt, riêng cho từng địa chỉ website. Chúng không nằm trong file mã nguồn và không tự chuyển từ bản demo sang địa chỉ GitHub Pages. Từ vựng mặc định nằm trong mảng `words` đầu file `game.js` nếu bạn muốn chỉnh bộ từ ban đầu cho mọi người chơi.

Logo thuộc thương hiệu do người dùng cung cấp. Các font có giấy phép đi kèm trong `fonts/`. Nhạc nền chiptune được tổng hợp bằng mã trong `game.js`; không cần file nhạc bên ngoài.

/* ==========================================================================
   ADMIN-MENU.JS - XỬ LÝ HÌNH ĐẠI DIỆN & MENU QUẢN TRỊ VIÊN
   - Hiển thị hình đại diện + tên trên Header
   - Mở / Đóng Menu Quản Trị Viên (Dropdown)
   - Đổi ảnh đại diện (upload từ máy tính hoặc dùng ảnh mặc định)
   - Lưu trữ avatar vào localStorage (ems_user_avatar)
   ========================================================================== */
'use strict';

const AVATAR_KEY = 'ems_user_avatar';
const AUTH_KEY = 'ems_auth';

// Ảnh đại diện mặc định (Vector SVG sắc nét, chuẩn Modern Tech)
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%230284c7'/><stop offset='50%' stop-color='%2338bdf8'/><stop offset='100%' stop-color='%236366f1'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(%23g)'/><circle cx='50' cy='38' r='18' fill='%23ffffff'/><path d='M20 86 c2 -18 13 -27 30 -27 s28 9 30 27 Z' fill='%23ffffff'/><circle cx='76' cy='76' r='11' fill='%2310b981' stroke='%230b1120' stroke-width='3'/></svg>";

const AdminMenu = {
    /**
     * Lấy ảnh đại diện hiện tại (nếu chưa có thì dùng mặc định)
     */
    getAvatar() {
        try {
            return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
        } catch (e) {
            return DEFAULT_AVATAR;
        }
    },

    /**
     * Lưu ảnh đại diện mới vào localStorage
     */
    setAvatar(dataUrl) {
        try {
            localStorage.setItem(AVATAR_KEY, dataUrl);
            this.updateAllAvatars(dataUrl);
            window.dispatchEvent(new CustomEvent('ems_avatar_changed', { detail: { avatar: dataUrl } }));
        } catch (e) {
            console.warn('Không thể lưu avatar vào localStorage:', e);
        }
    },

    /**
     * Lấy thông tin user hiện tại
     */
    getUserInfo() {
        try {
            const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    name: parsed.name || 'Quản trị viên',
                    username: parsed.username || 'admin',
                    role: (parsed.username === 'admin') ? 'Quản trị viên hệ thống' : 'Người dùng'
                };
            }
        } catch (e) {}
        return {
            name: 'Quản trị viên',
            username: 'admin',
            role: 'Quản trị viên hệ thống'
        };
    },

    /**
     * Cập nhật tất cả các vị trí hiển thị avatar trên trang
     */
    updateAllAvatars(avatarUrl) {
        const url = avatarUrl || this.getAvatar();

        // 1. Thumbnail trên nút Header
        const headerThumbs = document.querySelectorAll('.admin-avatar-thumb');
        headerThumbs.forEach(img => {
            img.src = url;
        });

        // 2. Avatar lớn trong Dropdown Menu
        const menuAvatars = document.querySelectorAll('.admin-menu-avatar');
        menuAvatars.forEach(img => {
            img.src = url;
        });

        // 3. Avatar trên trang Hồ sơ cá nhân (nếu có)
        const profileAvatarImg = document.getElementById('profile-avatar-custom-img');
        if (profileAvatarImg) {
            profileAvatarImg.src = url;
            profileAvatarImg.style.display = 'block';
            const letter = document.getElementById('avatar-letter');
            if (letter) letter.style.display = 'none';
        }
    },

    /**
     * Cập nhật tên và thông tin người dùng lên Menu & Header
     */
    updateUserInfo() {
        const user = this.getUserInfo();

        // Header name
        const navName = document.getElementById('nav-profile-name');
        if (navName) navName.textContent = user.name;

        // Dropdown menu name & role
        const menuName = document.getElementById('admin-menu-user-name');
        if (menuName) menuName.textContent = user.name;

        const menuRole = document.getElementById('admin-menu-user-role');
        if (menuRole) menuRole.textContent = user.role;

        const menuEmail = document.getElementById('admin-menu-user-email');
        if (menuEmail) {
            menuEmail.textContent = (user.username === 'admin')
                ? 'admin@hethonggiamsatdiennang.vn'
                : (user.username + '@hethonggiamsatdiennang.vn');
        }
    },

    /**
     * Xử lý tải ảnh đại diện từ file máy tính
     */
    handleFileUpload(file) {
        if (!file) return;

        // Kiểm tra định dạng ảnh
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP, SVG)!');
            return;
        }

        // Giới hạn dung lượng dưới 3MB để lưu vừa localStorage
        if (file.size > 3 * 1024 * 1024) {
            alert('Dung lượng ảnh quá lớn! Vui lòng chọn ảnh dưới 3MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.setAvatar(dataUrl);
            if (typeof showToast === 'function') {
                showToast('Đã cập nhật hình đại diện thành công!', 'fa-circle-check', 'var(--success)');
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Đặt lại ảnh đại diện về mặc định
     */
    resetToDefault() {
        try {
            localStorage.removeItem(AVATAR_KEY);
            this.updateAllAvatars(DEFAULT_AVATAR);
            if (typeof showToast === 'function') {
                showToast('Đã khôi phục ảnh đại diện mặc định!', 'fa-arrow-rotate-left', 'var(--primary)');
            }
        } catch (e) {}
    },

    /**
     * Mở / đóng Dropdown Menu
     */
    toggleMenu(force) {
        const wrapper = document.querySelector('.admin-menu-wrapper');
        if (!wrapper) return;

        const isOpen = wrapper.classList.contains('open');
        const shouldOpen = (typeof force === 'boolean') ? force : !isOpen;

        if (shouldOpen) {
            wrapper.classList.add('open');
        } else {
            wrapper.classList.remove('open');
        }
    },

    /**
     * Khởi tạo các sự kiện
     */
    init() {
        this.updateAllAvatars();
        this.updateUserInfo();

        // 1. Bấm vào nút Quản trị viên để đóng/mở Menu
        const trigger = document.getElementById('admin-menu-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        // 2. Click bên ngoài để tự động đóng menu
        document.addEventListener('click', (e) => {
            const wrapper = document.querySelector('.admin-menu-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                this.toggleMenu(false);
            }
        });

        // 3. Phím Escape để đóng menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleMenu(false);
            }
        });

        // 4. Input file upload ẩn
        const fileInput = document.getElementById('admin-avatar-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
                // Reset input để có thể chọn lại cùng 1 file nếu muốn
                fileInput.value = '';
            });
        }

        // 5. Nút "Đổi ảnh đại diện" trong Menu
        const btnChangeAvatar = document.getElementById('btn-menu-change-avatar');
        if (btnChangeAvatar && fileInput) {
            btnChangeAvatar.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMenu(false);
                fileInput.click();
            });
        }

        // 6. Nút "Dùng ảnh mặc định" trong Menu
        const btnDefaultAvatar = document.getElementById('btn-menu-default-avatar');
        if (btnDefaultAvatar) {
            btnDefaultAvatar.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMenu(false);
                this.resetToDefault();
            });
        }

        // 7. Nút Đăng xuất trong Menu
        const btnMenuLogout = document.getElementById('btn-menu-logout');
        if (btnMenuLogout) {
            btnMenuLogout.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    localStorage.removeItem(AUTH_KEY);
                    sessionStorage.removeItem(AUTH_KEY);
                } catch (err) {}
                location.replace('login.html');
            });
        }

        // 8. Lắng nghe thay đổi từ tab khác
        window.addEventListener('storage', (e) => {
            if (e.key === AVATAR_KEY) {
                this.updateAllAvatars(e.newValue);
            }
            if (e.key === AUTH_KEY) {
                this.updateUserInfo();
            }
        });

        window.addEventListener('ems_avatar_changed', (e) => {
            if (e.detail && e.detail.avatar) {
                this.updateAllAvatars(e.detail.avatar);
            }
        });
    }
};

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminMenu.init());
} else {
    AdminMenu.init();
}

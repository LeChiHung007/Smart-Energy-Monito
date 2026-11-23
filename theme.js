/* ==========================================================================
   THEME.JS - HỆ THỐNG CHUYỂN ĐỔI GIAO DIỆN SÁNG / TỐI
   Đồng bộ trên toàn bộ hệ thống qua localStorage (ems_theme)
   Hỗ trợ: index.html, statistics.html, profile.html
   ========================================================================== */
'use strict';

const THEME_KEY = 'ems_theme';

const ThemeManager = {
    /**
     * Lấy theme hiện tại từ localStorage (mặc định: 'dark')
     */
    get() {
        try {
            return localStorage.getItem(THEME_KEY) || 'dark';
        } catch (e) {
            return 'dark';
        }
    },

    /**
     * Lưu theme vào localStorage
     */
    set(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (e) {}
    },

    /**
     * Áp dụng theme lên document
     */
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.set(theme);
        this.updateToggleButtons(theme);
        this.updateProfileSwitch(theme);
    },

    /**
     * Chuyển đổi giữa sáng/tối
     */
    toggle() {
        const current = this.get();
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    },

    /**
     * Cập nhật icon và text của tất cả nút toggle trên header
     */
    updateToggleButtons(theme) {
        const btns = document.querySelectorAll('.theme-toggle-btn');
        btns.forEach(btn => {
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            if (theme === 'light') {
                if (icon) icon.className = 'fas fa-moon';
                if (text) text.textContent = 'Tối';
                btn.title = 'Chuyển sang giao diện tối';
            } else {
                if (icon) icon.className = 'fas fa-sun';
                if (text) text.textContent = 'Sáng';
                btn.title = 'Chuyển sang giao diện sáng';
            }
        });
    },

    /**
     * Đồng bộ toggle switch trong trang Hồ sơ (nếu có)
     */
    updateProfileSwitch(theme) {
        const sw = document.getElementById('opt-dark-mode');
        if (sw) {
            sw.checked = (theme === 'dark');
        }
    },

    /**
     * Khởi tạo: áp dụng theme đã lưu + gắn sự kiện cho nút toggle
     */
    init() {
        // Áp dụng theme ngay lập tức
        const theme = this.get();
        this.apply(theme);

        // Gắn click cho tất cả nút theme-toggle-btn trên header
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-toggle-btn');
            if (btn) {
                e.preventDefault();
                const newTheme = this.toggle();
                // Toast thông báo nếu có hàm showToast
                if (typeof showToast === 'function') {
                    showToast(
                        newTheme === 'light' ? 'Đã chuyển sang giao diện sáng' : 'Đã chuyển sang giao diện tối',
                        newTheme === 'light' ? 'fa-sun' : 'fa-moon',
                        newTheme === 'light' ? 'var(--warning)' : 'var(--primary)'
                    );
                }
            }
        });

        // Gắn sự kiện cho toggle switch trong Hồ sơ (nếu có)
        const profileSwitch = document.getElementById('opt-dark-mode');
        if (profileSwitch) {
            profileSwitch.disabled = false; // Bật lại switch
            profileSwitch.addEventListener('change', () => {
                const newTheme = profileSwitch.checked ? 'dark' : 'light';
                this.apply(newTheme);
                if (typeof showToast === 'function') {
                    showToast(
                        newTheme === 'light' ? 'Đã chuyển sang giao diện sáng' : 'Đã chuyển sang giao diện tối',
                        newTheme === 'light' ? 'fa-sun' : 'fa-moon',
                        newTheme === 'light' ? 'var(--warning)' : 'var(--primary)'
                    );
                }
            });
        }

        // Lắng nghe thay đổi từ tab/cửa sổ khác (đồng bộ đa tab)
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_KEY && e.newValue) {
                this.apply(e.newValue);
            }
        });
    }
};

// Khởi tạo khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

/* ==========================================================================
   PROFILE.JS - LOGIC TRANG HỒ SƠ CÁ NHÂN
   - Quản lý xem và chỉnh sửa thông tin cá nhân
   - Đồng bộ thông tin với localStorage (ems_profile_<username>, ems_auth)
   - Tự động điền dữ liệu mặc định và lưu tức thời
   ========================================================================== */
'use strict';

const AUTH_KEY = 'ems_auth';
const PROFILE_PREFIX = 'ems_profile_';

const $ = (id) => document.getElementById(id);

/* ---------- Đọc thông tin đăng nhập (hoặc dùng mặc định nếu chưa đăng nhập) ---------- */
function getAuthInfo() {
    try {
        const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.username) return parsed;
        }
    } catch (e) {}
    
    // Mặc định tài khoản Quản trị viên
    const defaultAuth = {
        username: 'admin',
        name: 'Quản trị viên',
        role: 'Quản trị viên hệ thống'
    };
    try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(defaultAuth));
    } catch (e) {}
    return defaultAuth;
}

let authInfo = getAuthInfo();

/* ---------- Profile key theo username ---------- */
const PROFILE_KEY = PROFILE_PREFIX + ((authInfo && authInfo.username) ? authInfo.username : 'admin');

/* ---------- Dữ liệu mặc định cho từng tài khoản ---------- */
const DEFAULT_PROFILES = {
    admin: {
        name: 'Quản trị viên',
        code: 'ADM-001',
        email: 'admin@hethonggiamsatdiennang.vn',
        phone: '0909 000 001',
        department: 'Quản trị hệ thống',
        location: 'TP. Hồ Chí Minh, Việt Nam',
        bio: 'Quản trị viên hệ thống giám sát điện năng thông minh. Phụ trách vận hành và bảo trì toàn bộ hạ tầng IoT.',
        role: 'Quản trị viên - System Admin',
        skills: ['IoT', 'Quản trị', 'Hệ thống', 'Giám sát']
    },
    tuananh: {
        name: 'Tuấn Anh',
        code: '125000229',
        email: 'tuananh@hethonggiamsatdiennang.vn',
        phone: '0987 200 221',
        department: 'Công nghệ thông tin',
        location: 'Đồng Nai, Việt Nam',
        bio: 'Sinh viên yêu thích công nghệ, thiết kế giao diện và phát triển web.',
        role: 'Student - Information Technology',
        skills: ['HTML5', 'CSS3', 'JavaScript', 'UI/UX']
    }
};

/* ---------- Tải / Lưu profile ---------- */
function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem('ems_profile_admin') || localStorage.getItem('ems_profile');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.name || parsed.email)) return parsed;
        }
    } catch (e) {}

    const username = (authInfo && authInfo.username) ? authInfo.username : 'admin';
    if (DEFAULT_PROFILES[username]) {
        return { ...DEFAULT_PROFILES[username] };
    }
    return { ...DEFAULT_PROFILES.admin };
}

function saveProfile(profile) {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        localStorage.setItem('ems_profile', JSON.stringify(profile));
    } catch (e) {
        console.error('Không thể lưu profile vào localStorage:', e);
    }
}

/* ---------- Hiển thị dữ liệu lên giao diện ---------- */
let currentProfile = loadProfile();

function renderProfile(profile) {
    // 1. Chữ cái đại diện avatar nếu không có ảnh tùy chỉnh
    const firstLetter = profile.name ? profile.name.trim().charAt(0).toUpperCase() : 'A';
    const avatarLetterEl = $('avatar-letter');
    if (avatarLetterEl) avatarLetterEl.textContent = firstLetter;

    // 2. Tên hiển thị & Vai trò
    const dispNameEl = $('profile-display-name');
    if (dispNameEl) dispNameEl.textContent = profile.name || 'Quản trị viên';

    const roleEl = $('profile-role-text');
    if (roleEl) roleEl.textContent = profile.role || 'Quản trị viên hệ thống';

    // 3. Các trường input biểu mẫu
    if ($('pf-name')) $('pf-name').value = profile.name || '';
    if ($('pf-code')) $('pf-code').value = profile.code || '';
    if ($('pf-email')) $('pf-email').value = profile.email || '';
    if ($('pf-phone')) $('pf-phone').value = profile.phone || '';
    if ($('pf-department')) $('pf-department').value = profile.department || '';
    if ($('pf-location')) $('pf-location').value = profile.location || '';
    if ($('pf-bio')) $('pf-bio').value = profile.bio || '';

    // 4. Khối Thông tin nhanh ở Sidebar bên phải
    if ($('qi-email')) $('qi-email').textContent = profile.email || '---';
    if ($('qi-phone')) $('qi-phone').textContent = profile.phone || '---';
    if ($('qi-code')) $('qi-code').textContent = profile.code || '---';

    // 5. Đồng bộ tên lên Header và Menu Quản trị viên
    const navName = $('nav-profile-name');
    if (navName) navName.textContent = profile.name || 'Quản trị viên';

    const menuName = $('admin-menu-user-name');
    if (menuName) menuName.textContent = profile.name || 'Quản trị viên';

    const menuEmail = $('admin-menu-user-email');
    if (menuEmail) menuEmail.textContent = profile.email || 'admin@hethonggiamsatdiennang.vn';

    // 6. Danh sách thẻ kỹ năng (Skill tags)
    const tagsContainer = $('quick-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        const skills = (profile.skills && profile.skills.length > 0)
            ? profile.skills
            : ['IoT', 'Quản trị', 'Hệ thống', 'Giám sát'];
        skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            tagsContainer.appendChild(tag);
        });
    }
}

// Khởi chạy hiển thị lần đầu
renderProfile(currentProfile);

/* ---------- Toast Notification ---------- */
let toastTimer;
function showToast(msg, icon = 'fa-circle-check', color = 'var(--success)') {
    const t = $('app-toast');
    if (!t) return;
    const iconEl = t.querySelector('i');
    if (iconEl) {
        iconEl.className = 'fas ' + icon;
        iconEl.style.color = color;
    }
    const msgEl = $('toast-message');
    if (msgEl) msgEl.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ---------- Chỉnh sửa hồ sơ ---------- */
const formGrid = $('profile-form');
const btnEdit = $('btn-edit-profile');
const btnSave = $('btn-save-profile');
const btnCancel = $('btn-cancel-edit');

function highlightEditing() {
    const wraps = document.querySelectorAll('#profile-form .profile-input-wrap');
    wraps.forEach(wrap => wrap.classList.add('editing'));
}

// Khi bấm nút "Chỉnh sửa"
if (btnEdit) {
    btnEdit.addEventListener('click', () => {
        highlightEditing();
        const nameInput = $('pf-name');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
        showToast('Bạn có thể chỉnh sửa thông tin bên dưới và nhấn "Lưu thay đổi"', 'fa-pen-to-square', 'var(--primary)');
    });
}

// Khi người dùng click hoặc focus vào bất kỳ ô input nào -> tự động kích hoạt hiệu ứng chỉnh sửa
const allInputs = document.querySelectorAll('#profile-form input, #profile-form textarea');
allInputs.forEach(input => {
    input.addEventListener('focus', () => {
        highlightEditing();
    });
});

// Nút "Hủy": Khôi phục dữ liệu đã lưu
if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        renderProfile(currentProfile);
        const wraps = document.querySelectorAll('#profile-form .profile-input-wrap');
        wraps.forEach(wrap => wrap.classList.remove('editing'));
        showToast('Đã khôi phục thông tin ban đầu', 'fa-arrow-rotate-left', 'var(--text-muted)');
    });
}

// Nút "Lưu thay đổi"
if (btnSave) {
    btnSave.addEventListener('click', () => {
        const nameVal = $('pf-name') ? $('pf-name').value.trim() : '';
        const codeVal = $('pf-code') ? $('pf-code').value.trim() : '';
        const emailVal = $('pf-email') ? $('pf-email').value.trim() : '';
        const phoneVal = $('pf-phone') ? $('pf-phone').value.trim() : '';
        const deptVal = $('pf-department') ? $('pf-department').value.trim() : '';
        const locVal = $('pf-location') ? $('pf-location').value.trim() : '';
        const bioVal = $('pf-bio') ? $('pf-bio').value.trim() : '';

        if (!nameVal) {
            showToast('Vui lòng nhập họ và tên!', 'fa-circle-exclamation', 'var(--danger)');
            if ($('pf-name')) $('pf-name').focus();
            return;
        }

        // Cập nhật đối tượng hồ sơ
        currentProfile = {
            name: nameVal,
            code: codeVal,
            email: emailVal,
            phone: phoneVal,
            department: deptVal,
            location: locVal,
            bio: bioVal,
            role: currentProfile.role || 'Quản trị viên - System Admin',
            skills: currentProfile.skills || ['IoT', 'Quản trị', 'Hệ thống', 'Giám sát']
        };

        // Đồng bộ với session đăng nhập ems_auth
        try {
            authInfo = {
                username: (authInfo && authInfo.username) ? authInfo.username : 'admin',
                name: currentProfile.name,
                role: currentProfile.role
            };
            const authStr = JSON.stringify(authInfo);
            localStorage.setItem(AUTH_KEY, authStr);
            sessionStorage.setItem(AUTH_KEY, authStr);
        } catch (e) {}

        // Lưu vào localStorage
        saveProfile(currentProfile);

        // Hiển thị lại dữ liệu lên giao diện
        renderProfile(currentProfile);

        // Cập nhật lại admin-menu nếu có
        if (typeof AdminMenu !== 'undefined' && typeof AdminMenu.updateUserInfo === 'function') {
            AdminMenu.updateUserInfo();
        }

        // Xóa class editing
        const wraps = document.querySelectorAll('#profile-form .profile-input-wrap');
        wraps.forEach(wrap => wrap.classList.remove('editing'));

        // Thông báo lưu thành công
        showToast('Đã lưu thông tin hồ sơ thành công!', 'fa-circle-check', 'var(--success)');
    });
}

/* ---------- Upload ảnh đại diện từ trang Hồ sơ ---------- */
const avatarBox = $('profile-avatar');
const avatarFileInput = $('profile-avatar-file-input');
if (avatarBox && avatarFileInput) {
    avatarBox.addEventListener('click', () => {
        avatarFileInput.click();
    });
    avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && typeof AdminMenu !== 'undefined') {
            AdminMenu.handleFileUpload(file);
        }
        avatarFileInput.value = '';
    });
}

/* ---------- Đồng hồ realtime ---------- */
function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const el = $('live-clock');
    if (el) el.textContent = `${hh}:${mm}:${ss}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ---------- Đăng xuất ---------- */
const btnLogout = $('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', function () {
        try {
            localStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem(AUTH_KEY);
        } catch (e) {}
        location.replace('login.html');
    });
}

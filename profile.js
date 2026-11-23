/* ==========================================================================
   PROFILE.JS - LOGIC TRANG HỒ SƠ CÁ NHÂN
   Đồng bộ tên đăng nhập từ ems_auth (localStorage / sessionStorage)
   Lưu / đọc thông tin hồ sơ qua localStorage (ems_profile_<username>)
   ========================================================================== */
'use strict';

const AUTH_KEY = 'ems_auth';
const PROFILE_PREFIX = 'ems_profile_';

const $ = (id) => document.getElementById(id);

/* ---------- Đọc thông tin đăng nhập ---------- */
function getAuthInfo() {
    try {
        const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

const authInfo = getAuthInfo();
if (!authInfo || !authInfo.username) {
    location.replace('login.html');
}

/* ---------- Profile key theo username ---------- */
const PROFILE_KEY = PROFILE_PREFIX + (authInfo ? authInfo.username : 'guest');

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
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.name) return parsed;
        }
    } catch (e) {}

    // Dùng dữ liệu mặc định nếu có, không thì tạo từ authInfo
    const username = authInfo ? authInfo.username : 'guest';
    if (DEFAULT_PROFILES[username]) {
        return { ...DEFAULT_PROFILES[username] };
    }
    return {
        name: (authInfo && authInfo.name) || username,
        code: '',
        email: username + '@hethonggiamsatdiennang.vn',
        phone: '',
        department: '',
        location: '',
        bio: '',
        role: 'Người dùng hệ thống',
        skills: ['HTML5', 'CSS3', 'JavaScript']
    };
}

function saveProfile(profile) {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error('Không thể lưu profile', e);
    }
}

/* ---------- Hiển thị dữ liệu lên giao diện ---------- */
let currentProfile = loadProfile();

function renderProfile(profile) {
    // Avatar letter
    const firstLetter = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
    $('avatar-letter').textContent = firstLetter;

    // Display name
    $('profile-display-name').textContent = profile.name || '---';

    // Role
    $('profile-role-text').textContent = profile.role || 'Người dùng';

    // Form fields
    $('pf-name').value = profile.name || '';
    $('pf-code').value = profile.code || '';
    $('pf-email').value = profile.email || '';
    $('pf-phone').value = profile.phone || '';
    $('pf-department').value = profile.department || '';
    $('pf-location').value = profile.location || '';
    $('pf-bio').value = profile.bio || '';

    // Quick info sidebar
    $('qi-email').textContent = profile.email || '---';
    $('qi-phone').textContent = profile.phone || '---';
    $('qi-code').textContent = profile.code || '---';

    // Skill tags
    const tagsContainer = $('quick-tags');
    tagsContainer.innerHTML = '';
    const skills = profile.skills || ['HTML5', 'CSS3', 'JavaScript'];
    skills.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = skill;
        tagsContainer.appendChild(tag);
    });
}

renderProfile(currentProfile);

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg, icon = 'fa-circle-check', color = 'var(--success)') {
    const t = $('app-toast');
    t.querySelector('i').className = 'fas ' + icon;
    t.querySelector('i').style.color = color;
    $('toast-message').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ---------- Chỉnh sửa hồ sơ ---------- */
let isEditing = false;

function setEditing(editing) {
    isEditing = editing;
    const inputs = document.querySelectorAll('#profile-form input, #profile-form textarea');
    const wraps = document.querySelectorAll('#profile-form .profile-input-wrap');

    inputs.forEach(input => {
        input.disabled = !editing;
    });

    wraps.forEach(wrap => {
        wrap.classList.toggle('editing', editing);
    });

    $('profile-form-actions').hidden = !editing;
    $('btn-edit-profile').style.display = editing ? 'none' : '';

    if (editing) {
        $('pf-name').focus();
    }
}

$('btn-edit-profile').addEventListener('click', () => {
    setEditing(true);
});

$('btn-cancel-edit').addEventListener('click', () => {
    // Khôi phục dữ liệu cũ
    renderProfile(currentProfile);
    setEditing(false);
});

$('btn-save-profile').addEventListener('click', () => {
    // Đọc dữ liệu từ form
    const updated = {
        name: $('pf-name').value.trim(),
        code: $('pf-code').value.trim(),
        email: $('pf-email').value.trim(),
        phone: $('pf-phone').value.trim(),
        department: $('pf-department').value.trim(),
        location: $('pf-location').value.trim(),
        bio: $('pf-bio').value.trim(),
        role: currentProfile.role,
        skills: currentProfile.skills
    };

    if (!updated.name) {
        showToast('Vui lòng nhập họ và tên!', 'fa-circle-exclamation', 'var(--danger)');
        $('pf-name').focus();
        return;
    }

    // Cập nhật tên trong auth session để đồng bộ với menu
    if (authInfo) {
        authInfo.name = updated.name;
        const authStr = JSON.stringify(authInfo);
        try {
            if (localStorage.getItem(AUTH_KEY)) {
                localStorage.setItem(AUTH_KEY, authStr);
            } else {
                sessionStorage.setItem(AUTH_KEY, authStr);
            }
        } catch (e) {}
    }

    currentProfile = updated;
    saveProfile(currentProfile);
    renderProfile(currentProfile);
    setEditing(false);
    showToast('Đã lưu thông tin hồ sơ thành công!');
});

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
$('btn-logout').addEventListener('click', function () {
    try { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    location.replace('login.html');
});

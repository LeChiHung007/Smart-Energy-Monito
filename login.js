/* ==========================================================================
   LOGIN.JS - Xử lý đăng nhập (mô phỏng, không có backend)
   - Validate form, hiện/ẩn mật khẩu, cảnh báo Caps Lock
   - Ghi nhớ đăng nhập (localStorage) / phiên tạm (sessionStorage)
   - Khóa 30s nếu nhập sai 5 lần
   ========================================================================== */
'use strict';

const AUTH_KEY = 'ems_auth';
const FAIL_KEY = 'ems_login_fails';
const MAX_FAILS = 5;
const LOCK_SECONDS = 30;

// Tài khoản mô phỏng (đồ án frontend, không dùng cho hệ thống thật)
const USERS = [
    { username: 'admin', email: 'admin@hethonggiamsatdiennang.vn', password: '123456', name: 'Quản trị viên' },
    { username: 'tuananh', email: 'tuananh@hethonggiamsatdiennang.vn', password: 'tuananh123', name: 'Tuấn Anh' }
];

const $ = (id) => document.getElementById(id);
const form = $('login-form');
const elUser = $('username');
const elPass = $('password');
const btnSubmit = $('btn-submit');

function safeGet(store, key) { try { return store.getItem(key); } catch { return null; } }
function safeSet(store, key, val) { try { store.setItem(key, val); } catch { /* bỏ qua */ } }
function safeDel(store, key) { try { store.removeItem(key); } catch { /* bỏ qua */ } }

/* ---------- Đã đăng nhập thì chuyển thẳng vào dashboard ---------- */
(function redirectIfLoggedIn() {
    const raw = safeGet(localStorage, AUTH_KEY) || safeGet(sessionStorage, AUTH_KEY);
    if (raw) {
        try { if (JSON.parse(raw).username) location.replace('index.html'); } catch { /* phiên hỏng */ }
    }
})();

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

/* ---------- Alert chung của form ---------- */
function showAlert(msg, ok = false) {
    const a = $('form-alert');
    a.classList.toggle('ok', ok);
    a.querySelector('i').className = 'fas ' + (ok ? 'fa-circle-check' : 'fa-circle-exclamation');
    $('form-alert-text').textContent = msg;
    a.hidden = false;
}
function hideAlert() { $('form-alert').hidden = true; }

/* ---------- Validate ---------- */
function setError(fieldId, errId, msg) {
    const f = $(fieldId);
    $(errId).textContent = msg || '';
    f.classList.remove('invalid');
    if (msg) { void f.offsetWidth; f.classList.add('invalid'); } // restart animation
    f.querySelector('input').setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateUser() {
    const v = elUser.value.trim();
    if (!v) return setError('field-username', 'err-username', 'Vui lòng nhập tên đăng nhập hoặc email.');
    if (v.includes('@') && !EMAIL_RE.test(v)) return setError('field-username', 'err-username', 'Email chưa đúng định dạng.');
    if (!v.includes('@') && v.length < 3) return setError('field-username', 'err-username', 'Tên đăng nhập tối thiểu 3 ký tự.');
    return setError('field-username', 'err-username', '');
}
function validatePass() {
    const v = elPass.value;
    if (!v) return setError('field-password', 'err-password', 'Vui lòng nhập mật khẩu.');
    if (v.length < 6) return setError('field-password', 'err-password', 'Mật khẩu tối thiểu 6 ký tự.');
    return setError('field-password', 'err-password', '');
}

// Xóa lỗi khi người dùng gõ lại
elUser.addEventListener('input', () => { $('field-username').classList.remove('invalid'); hideAlert(); });
elPass.addEventListener('input', () => { $('field-password').classList.remove('invalid'); hideAlert(); });
elUser.addEventListener('blur', () => { if (elUser.value) validateUser(); });
elPass.addEventListener('blur', () => { if (elPass.value) validatePass(); });

/* ---------- Hiện / ẩn mật khẩu + Caps Lock ---------- */
$('toggle-pass').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const show = elPass.type === 'password';
    elPass.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    btn.querySelector('i').className = 'fas ' + (show ? 'fa-eye-slash' : 'fa-eye');
    elPass.focus();
});
function checkCaps(e) {
    if (typeof e.getModifierState === 'function') $('caps-warn').hidden = !e.getModifierState('CapsLock');
}
elPass.addEventListener('keydown', checkCaps);
elPass.addEventListener('keyup', checkCaps);
elPass.addEventListener('blur', () => { $('caps-warn').hidden = true; });

/* ---------- Tài khoản demo / quên mật khẩu ---------- */
$('btn-fill-demo').addEventListener('click', () => {
    elUser.value = 'admin';
    elPass.value = '123456';
    ['field-username', 'field-password'].forEach((id) => $(id).classList.remove('invalid'));
    hideAlert();
    showToast('Đã điền tài khoản demo');
    btnSubmit.focus();
});
$('forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Tính năng demo: liên hệ quản trị viên để cấp lại mật khẩu.', 'fa-circle-info', 'var(--primary)');
});

/* ---------- Khóa tạm thời khi sai nhiều lần ---------- */
let lockTimer;
function getLockUntil() { return Number(safeGet(localStorage, FAIL_KEY + '_until')) || 0; }
function startLockCountdown() {
    clearInterval(lockTimer);
    const tick = () => {
        const left = Math.ceil((getLockUntil() - Date.now()) / 1000);
        if (left <= 0) {
            clearInterval(lockTimer);
            safeDel(localStorage, FAIL_KEY);
            safeDel(localStorage, FAIL_KEY + '_until');
            btnSubmit.disabled = false;
            hideAlert();
            return;
        }
        btnSubmit.disabled = true;
        showAlert(`Sai quá ${MAX_FAILS} lần. Vui lòng thử lại sau ${left} giây.`);
    };
    tick();
    lockTimer = setInterval(tick, 1000);
}
if (getLockUntil() > Date.now()) startLockCountdown();

/* ---------- Submit ---------- */
function findUser(id, pw) {
    const key = id.trim().toLowerCase();
    return USERS.find((u) => (u.username === key || u.email === key) && u.password === pw) || null;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (getLockUntil() > Date.now()) return;
    hideAlert();

    const okUser = validateUser();
    const okPass = validatePass();
    if (!okUser || !okPass) {
        (okUser ? elPass : elUser).focus();
        return;
    }

    btnSubmit.classList.add('loading');
    btnSubmit.disabled = true;

    // Giả lập độ trễ gọi server
    setTimeout(() => {
        const user = findUser(elUser.value, elPass.value);
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;

        if (!user) {
            const fails = (Number(safeGet(localStorage, FAIL_KEY)) || 0) + 1;
            safeSet(localStorage, FAIL_KEY, String(fails));
            if (fails >= MAX_FAILS) {
                safeSet(localStorage, FAIL_KEY + '_until', String(Date.now() + LOCK_SECONDS * 1000));
                startLockCountdown();
            } else {
                showAlert(`Tên đăng nhập hoặc mật khẩu không đúng. Còn ${MAX_FAILS - fails} lần thử.`);
            }
            elPass.select();
            return;
        }

        safeDel(localStorage, FAIL_KEY);
        const session = JSON.stringify({ username: user.username, name: user.name, at: Date.now() });
        const remember = $('remember').checked;
        safeDel(localStorage, AUTH_KEY);
        safeDel(sessionStorage, AUTH_KEY);
        safeSet(remember ? localStorage : sessionStorage, AUTH_KEY, session);

        btnSubmit.disabled = true;
        showAlert(`Đăng nhập thành công! Xin chào ${user.name}...`, true);
        setTimeout(() => location.replace('index.html'), 700);
    }, 800);
});

/* ---------- Biểu đồ cột trang trí ở panel trái ---------- */
(function animatePreview() {
    const box = $('preview-bars');
    if (!box) return;
    const bars = Array.from({ length: 24 }, () => box.appendChild(document.createElement('span')));
    const kw = $('preview-power');
    const update = () => {
        let sum = 0;
        bars.forEach((b) => {
            const h = 20 + Math.random() * 80;
            b.style.height = h + '%';
            sum += h;
        });
        kw.textContent = (sum / bars.length / 30).toFixed(2) + ' kW';
    };
    update();
    setInterval(update, 1800);
})();

elUser.focus();

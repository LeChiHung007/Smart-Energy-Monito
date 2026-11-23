/**
 * AI ADVISOR - Khối "Gợi ý tiết kiệm điện"
 * 1) Lấy dữ liệu từ API mở Open-Meteo (không cần API key): nhiệt độ & độ ẩm hiện tại tại Hà Nội.
 * 2) Phân tích trạng thái thiết bị trong AppState và sinh gợi ý (bộ luật thông minh chạy tại trình duyệt).
 *
 * Lưu ý: đây là bộ luật (rule-based), không gọi mô hình ngôn ngữ thật. Mã nguồn của module này
 * được sinh và tối ưu với sự hỗ trợ của AI (xem mục "Ứng dụng AI" trong README.md).
 */
'use strict';

const AIAdvisor = {
    weather: null,                 // { temp, humidity } hoặc null nếu API lỗi
    weatherSource: 'Đang tải...',
    API_URL: 'https://api.open-meteo.com/v1/forecast?latitude=21.03&longitude=105.85&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FBangkok',

    init() {
        const aside = document.querySelector('.tariff-sidebar');
        if (!aside || typeof AppState === 'undefined') return;

        const card = document.createElement('div');
        card.className = 'ai-card';
        card.innerHTML = `
            <div class="section-header">
                <div>
                    <h2 class="section-title"><i class="fas fa-wand-magic-sparkles" style="color: var(--info);"></i> Trợ lý AI gợi ý tiết kiệm</h2>
                    <span class="section-subtitle">Phân tích thiết bị đang chạy + thời tiết thực tế</span>
                </div>
            </div>
            <div class="ai-weather" id="ai-weather"><i class="fas fa-cloud-sun"></i> <span>Đang lấy thời tiết...</span>
                <button type="button" id="ai-refresh" title="Tải lại thời tiết"><i class="fas fa-rotate"></i></button>
            </div>
            <ul class="ai-tips" id="ai-tips" aria-live="polite"></ul>`;
        aside.appendChild(card);

        document.getElementById('ai-refresh').addEventListener('click', () => this.loadWeather());
        this.loadWeather();
        this.render();
        setInterval(() => this.render(), 2000);
    },

    async loadWeather() {
        const el = document.querySelector('#ai-weather span');
        el.textContent = 'Đang lấy thời tiết...';
        try {
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), 6000);
            const res = await fetch(this.API_URL, { signal: ctl.signal });
            clearTimeout(timer);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            this.weather = {
                temp: json.current.temperature_2m,
                humidity: json.current.relative_humidity_2m
            };
            this.weatherSource = 'Open-Meteo';
            el.textContent = `Hà Nội: ${this.weather.temp}°C • Độ ẩm ${this.weather.humidity}% (nguồn Open-Meteo)`;
        } catch (err) {
            this.weather = null;
            el.textContent = 'Không tải được thời tiết (mất mạng?). Đang dùng gợi ý cơ bản.';
        }
        this.render();
    },

    /** Tổng hợp thiết bị đang bật từ AppState */
    snapshot() {
        const all = AppState.rooms.flatMap((r) => r.devices.map((d) => ({ ...d, room: r.name })));
        const on = all.filter((d) => d.status);
        const totalW = on.reduce((s, d) => s + d.powerCurrent, 0);
        return { all, on, totalW };
    },

    buildTips() {
        const { on, totalW } = this.snapshot();
        const tips = [];
        const add = (level, icon, text) => tips.push({ level, icon, text });

        if (on.length === 0) {
            add('good', 'fa-circle-check', 'Hiện không có thiết bị nào chạy. Hãy bật thử vài thiết bị để trợ lý phân tích.');
            return tips;
        }

        // 1. Thiết bị tốn điện nhất
        const top = [...on].sort((a, b) => b.powerCurrent - a.powerCurrent)[0];
        const share = Math.round((top.powerCurrent / totalW) * 100);
        add(share >= 40 ? 'warn' : 'info', 'fa-bolt',
            `${top.name} (${top.room}) đang chiếm ${share}% công suất (${top.powerCurrent} W).`);

        // 2. Điều hòa theo thời tiết
        const acs = on.filter((d) => d.type === 'ac');
        if (acs.length) {
            if (this.weather && this.weather.temp <= 26) {
                add('warn', 'fa-snowflake',
                    `Ngoài trời chỉ ${this.weather.temp}°C, hãy tắt điều hòa và mở cửa/quạt để tiết kiệm.`);
            } else if (this.weather && this.weather.temp >= 33) {
                add('info', 'fa-temperature-high',
                    `Trời nóng ${this.weather.temp}°C: đặt điều hòa 26–27°C kèm quạt trần để mát nhanh mà vẫn tiết kiệm.`);
            } else {
                add('info', 'fa-snowflake', 'Đặt điều hòa ở 26–27°C, mỗi 1°C tăng thêm giúp giảm khoảng 3–5% điện năng.');
            }
            if (acs.length > 1) {
                add('warn', 'fa-door-open', `Đang chạy ${acs.length} điều hòa cùng lúc, chỉ nên bật ở phòng đang sử dụng.`);
            }
        }

        // 3. Thiết bị không phải Eco có công suất lớn
        const heavy = on.filter((d) => !d.isEco && d.powerCurrent >= 800);
        heavy.forEach((d) => add('warn', 'fa-triangle-exclamation',
            `${d.name} công suất cao (${d.powerCurrent} W), nên dùng ngoài giờ cao điểm 17h–20h và tắt khi xong việc.`));

        // 4. Dự báo bậc thang theo công suất hiện tại (nếu bật liên tục 30 ngày)
        const monthKwh = (totalW / 1000) * 24 * 30;
        const tier = AppState.evnTariffTiers.find((t) => monthKwh <= t.to) || AppState.evnTariffTiers.at(-1);
        add(tier.tier >= 4 ? 'warn' : 'good', 'fa-chart-line',
            `Nếu giữ tải ${(totalW / 1000).toFixed(2)} kW suốt tháng: ~${Math.round(monthKwh)} kWh, rơi vào bậc ${tier.tier}.`);

        // 5. Khen khi tiết kiệm
        if (totalW < 500) add('good', 'fa-leaf', 'Tải đang rất thấp, tuyệt vời! Bạn đang tiết kiệm điện hiệu quả.');

        return tips;
    },

    render() {
        const ul = document.getElementById('ai-tips');
        if (!ul) return;
        // Dùng textContent để tránh chèn HTML từ dữ liệu
        ul.replaceChildren(...this.buildTips().map((t) => {
            const li = document.createElement('li');
            li.className = 'ai-tip ' + t.level;
            const i = document.createElement('i');
            i.className = 'fas ' + t.icon;
            const s = document.createElement('span');
            s.textContent = t.text;
            li.append(i, s);
            return li;
        }));
    }
};

document.addEventListener('DOMContentLoaded', () => AIAdvisor.init());

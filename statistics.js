/**
 * STATISTICS CONTROLLER MODULE (statistics.js)
 * Chịu trách nhiệm quản lý Trang Thống kê chi tiết:
 * 1. Đồng bộ số liệu điện năng và tiền điện thời gian thực từ Dashboard qua SharedStorage.
 * 2. Cập nhật 4 thẻ chỉ số KPI tổng quan (Tổng kWh, Tổng tiền, Công suất hiện tại, Dự kiến cuối tháng).
 * 3. Quản lý biểu đồ Chart.js theo 4 mốc thời gian: Phút, Giờ, Ngày, Tháng.
 * 4. Quản lý Bảng thống kê chi tiết theo từng thiết bị, sắp xếp từ cao xuống thấp.
 * 5. Cơ chế Heartbeat và đồng bộ Cross-tab (Storage Event).
 */

'use strict';

// Trạng thái cục bộ của Trang Thống kê (luôn đồng bộ với Dashboard)
const StatsState = {
    tabId: 'stats-tab-' + Math.random().toString(36).substring(2, 9),
    household: null,
    rooms: [],
    evnTariffTiers: [],
    vatRate: 0.08,
    speedMultiplier: 60,
    
    // Mốc thời gian đang chọn: 'minute' | 'hour' | 'day' | 'month'
    currentInterval: 'minute',
    // Chế độ xem biểu đồ: 'both' | 'kwh' | 'cost'
    currentView: 'both',
    // Kiểu hiển thị biểu đồ: 'line' | 'bar'
    chartType: 'line',
    
    // Bộ lọc bảng thiết bị
    tableFilterRoom: 'all',
    tableSearchKeyword: '',

    // Tham chiếu đối tượng Chart.js
    chartEnergy: null,
    chartCost: null,

    // Ticker mô phỏng nội bộ (nếu Dashboard không mở)
    simulationIntervalId: null,
    isLocalTickerRunning: false
};

/**
 * Format tiền tệ VNĐ chuẩn hóa tiếng Việt
 */
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * MODULE ĐỒNG BỘ & QUẢN LÝ DỮ LIỆU
 */
const StatsDataManager = {
    /**
     * Khởi tạo và nạp dữ liệu từ SharedStorage (hoặc INITIAL_DATA nếu chưa có)
     */
    init() {
        this.syncFromStorage();
        this.setupStorageListener();
        this.setupHeartbeatMonitor();
    },

    /**
     * Đọc trạng thái mới nhất từ localStorage
     */
    syncFromStorage() {
        const state = (typeof SharedStorage !== 'undefined') ? SharedStorage.loadState() : null;
        if (state) {
            StatsState.household = state.household || (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.household : {});
            StatsState.rooms = state.rooms || (typeof INITIAL_DATA !== 'undefined' ? JSON.parse(JSON.stringify(INITIAL_DATA.rooms)) : []);
            StatsState.evnTariffTiers = state.evnTariffTiers || (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.evnTariffTiers : []);
            StatsState.vatRate = state.vatRate || 0.08;
            StatsState.speedMultiplier = state.speedMultiplier || 60;
        } else if (typeof INITIAL_DATA !== 'undefined') {
            StatsState.household = JSON.parse(JSON.stringify(INITIAL_DATA.household));
            StatsState.rooms = JSON.parse(JSON.stringify(INITIAL_DATA.rooms));
            StatsState.evnTariffTiers = [...INITIAL_DATA.evnTariffTiers];
            StatsState.vatRate = INITIAL_DATA.vatRate;
            StatsState.speedMultiplier = 60;
        }
    },

    /**
     * Lắng nghe sự kiện storage để đồng bộ tức thì khi người dùng tương tác trên Dashboard
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (typeof SharedStorage === 'undefined') return;

            if (e.key === SharedStorage.KEYS.STATE && e.newValue) {
                try {
                    const incoming = JSON.parse(e.newValue);
                    if (incoming && Array.isArray(incoming.rooms)) {
                        StatsState.rooms = incoming.rooms;
                        if (incoming.household) StatsState.household = incoming.household;
                        if (incoming.speedMultiplier) StatsState.speedMultiplier = incoming.speedMultiplier;

                        // Cập nhật toàn bộ giao diện thống kê theo dữ liệu mới nhất
                        StatsRenderer.renderAll();
                        StatsChartManager.updateChartsData();
                    }
                } catch (err) {
                    console.error('[Statistics] Lỗi phân tích state từ storage event:', err);
                }
            } else if (e.key === SharedStorage.KEYS.HISTORY) {
                // Cập nhật biểu đồ khi có mẫu lịch sử mới
                StatsChartManager.updateChartsData();
            }
        });
    },

    /**
     * Quản lý Heartbeat: nếu Dashboard đang mở trong tab khác, tab này chỉ lắng nghe.
     * Nếu Dashboard đóng hoặc người dùng chuyển hướng tại cùng tab, trang này tự động duy trì mô phỏng.
     */
    setupHeartbeatMonitor() {
        setInterval(() => {
            if (typeof SharedStorage === 'undefined') return;

            const isOtherActive = SharedStorage.isOtherTabActive(StatsState.tabId);
            const syncBadge = document.getElementById('sync-status-badge');
            const syncText = document.getElementById('sync-status-text');

            if (isOtherActive) {
                // Có tab Dashboard đang chạy
                if (StatsState.isLocalTickerRunning) {
                    clearInterval(StatsState.simulationIntervalId);
                    StatsState.isLocalTickerRunning = false;
                }
                if (syncBadge) syncBadge.className = 'sync-status-badge active';
                if (syncText) syncText.textContent = 'Đang đồng bộ trực tiếp với Dashboard (1s)';
            } else {
                // Không có tab nào khác chạy -> Trang thống kê tiếp quản mô phỏng
                if (!StatsState.isLocalTickerRunning) {
                    this.startLocalSimulation();
                }
                if (syncBadge) syncBadge.className = 'sync-status-badge active';
                if (syncText) syncText.textContent = 'Chế độ Realtime Standalone (Đồng bộ 1s)';
            }
        }, 1500);
    },

    /**
     * Tiếp quản mô phỏng dòng điện thời gian thực khi Dashboard không hoạt động
     */
    startLocalSimulation() {
        StatsState.isLocalTickerRunning = true;
        StatsState.simulationIntervalId = setInterval(() => {
            let totalActiveWatts = 0;
            const impulseLed = document.getElementById('meter-impulse-led');

            StatsState.rooms.forEach(room => {
                room.devices.forEach(device => {
                    if (device.status) {
                        const delta = (Math.random() * 0.06 - 0.03);
                        const newPower = Math.round(device.powerNominal * (0.8 + delta));
                        device.powerCurrent = Math.max(10, newPower);
                        totalActiveWatts += device.powerCurrent;

                        const addedKwh = (device.powerCurrent * 1 * StatsState.speedMultiplier) / 3600000;
                        device.totalKwhMonth += addedKwh;
                    }
                });
            });

            if (totalActiveWatts > 0 && impulseLed) {
                impulseLed.classList.add('flash');
                setTimeout(() => impulseLed.classList.remove('flash'), 120);
            }

            // Ghi nhận vào SharedStorage
            if (typeof SharedStorage !== 'undefined') {
                SharedStorage.updateHeartbeat(StatsState.tabId);
                SharedStorage.saveState({
                    household: StatsState.household,
                    rooms: StatsState.rooms,
                    evnTariffTiers: StatsState.evnTariffTiers,
                    vatRate: StatsState.vatRate,
                    speedMultiplier: StatsState.speedMultiplier
                });
                SharedStorage.recordSample({
                    household: StatsState.household,
                    rooms: StatsState.rooms,
                    evnTariffTiers: StatsState.evnTariffTiers,
                    vatRate: StatsState.vatRate
                });
            }

            // Cập nhật giao diện
            StatsRenderer.renderAll();
            StatsChartManager.updateChartsData();

        }, 1000);
    }
};

/**
 * MODULE RENDER GIAO DIỆN CHÍNH
 */
const StatsRenderer = {
    renderAll() {
        this.renderMetrics();
        this.renderDeviceTable();
        this.renderHeaderMeta();
    },

    /**
     * Render 4 thẻ thông tin tổng quan (KPI Cards)
     * Sử dụng đúng nguồn công thức từ EnergyCalculator của Dashboard
     */
    renderMetrics() {
        if (!StatsState.rooms || typeof EnergyCalculator === 'undefined') return;

        // 1. Công suất hiện tại (W) của các thiết bị đang bật
        const currentPowerWatts = EnergyCalculator.calculateCurrentPower(StatsState.rooms);

        // 2. Tổng điện năng tiêu thụ (kWh) tích lũy chu kỳ hiện tại
        const totalKwh = EnergyCalculator.calculateTotalKwh(StatsState.rooms);

        // Đếm số thiết bị đang bật / tổng số
        const { activeCount, totalCount } = EnergyCalculator.getDeviceCounts(StatsState.rooms);

        // 3. Tổng tiền điện hiện tại (VNĐ) tính theo bậc thang EVN + VAT 8%
        const tiers = StatsState.evnTariffTiers || INITIAL_DATA.evnTariffTiers;
        const vatRate = StatsState.vatRate || 0.08;
        const actualBillObj = EnergyCalculator.calculateTieredBill(totalKwh, tiers, vatRate);
        const currentBillVnd = actualBillObj.totalWithVat;

        // 4. Dự kiến tiền điện cuối tháng (dựa trên lượng điện hiện tại và mốc ngày 20)
        const projectedKwh = EnergyCalculator.estimateMonthlyKwh(totalKwh, 20, 30);
        const projectedBillObj = EnergyCalculator.calculateTieredBill(projectedKwh, tiers, vatRate);
        const projectedBillVnd = projectedBillObj.totalWithVat;

        // Cập nhật DOM các thẻ KPI
        const elTotalKwh = document.getElementById('stat-total-kwh');
        const elTotalBill = document.getElementById('stat-total-bill');
        const elCurrentPower = document.getElementById('stat-current-power');
        const elActiveDevices = document.getElementById('stat-active-devices');
        const elTotalDevices = document.getElementById('stat-total-devices');
        const elEstBill = document.getElementById('stat-est-month-bill');
        const elEstKwh = document.getElementById('stat-est-month-kwh');

        if (elTotalKwh) elTotalKwh.textContent = totalKwh.toFixed(3);
        if (elTotalBill) elTotalBill.textContent = formatVND(currentBillVnd);
        if (elCurrentPower) elCurrentPower.textContent = currentPowerWatts.toLocaleString('vi-VN');
        if (elActiveDevices) elActiveDevices.textContent = activeCount;
        if (elTotalDevices) elTotalDevices.textContent = totalCount;
        if (elEstBill) elEstBill.textContent = formatVND(projectedBillVnd);
        if (elEstKwh) elEstKwh.textContent = `${projectedKwh.toFixed(1)} kWh`;
    },

    /**
     * Cập nhật thông tin Header và Tốc độ
     */
    renderHeaderMeta() {
        const elEcoPoints = document.getElementById('topbar-eco-points');
        if (elEcoPoints && StatsState.household) {
            elEcoPoints.textContent = `${StatsState.household.ecoPoints || 420} Điểm`;
        }

        const elSpeed = document.getElementById('current-speed-text');
        if (elSpeed) {
            elSpeed.textContent = `${StatsState.speedMultiplier || 60}x`;
        }
    },

    /**
     * Bảng thống kê chi tiết theo thiết bị
     * Yêu cầu:
     * - Lấy danh sách thiết bị từ Dashboard
     * - Tính điện năng thực tế của hệ thống mô phỏng
     * - Tính tỷ lệ tiêu thụ (%)
     * - Sắp xếp từ cao xuống thấp theo mức tiêu thụ
     * - Cập nhật khi trạng thái thiết bị thay đổi
     */
    renderDeviceTable() {
        const tbody = document.getElementById('device-table-body');
        const tfoot = document.getElementById('device-table-foot');
        if (!tbody || !StatsState.rooms) return;

        const totalKwhAll = EnergyCalculator.calculateTotalKwh(StatsState.rooms);

        // 1. Trải phẳng toàn bộ danh sách thiết bị kèm thông tin phòng
        let deviceList = StatsState.rooms.flatMap(room => 
            room.devices.map(device => ({
                ...device,
                roomId: room.id,
                roomName: room.name,
                roomIcon: room.icon
            }))
        );

        // 2. Lọc theo phòng nếu người dùng chọn
        if (StatsState.tableFilterRoom !== 'all') {
            deviceList = deviceList.filter(d => d.roomId === StatsState.tableFilterRoom);
        }

        // 3. Lọc theo từ khóa tìm kiếm (nếu có)
        if (StatsState.tableSearchKeyword.trim() !== '') {
            const kw = StatsState.tableSearchKeyword.toLowerCase();
            deviceList = deviceList.filter(d => 
                d.name.toLowerCase().includes(kw) || d.roomName.toLowerCase().includes(kw)
            );
        }

        // 4. YÊU CẦU: Sắp xếp thiết bị theo mức tiêu thụ từ cao xuống thấp
        deviceList.sort((a, b) => b.totalKwhMonth - a.totalKwhMonth);

        // 5. Render từng dòng trong bảng
        if (deviceList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        <i class="fas fa-inbox" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
                        Không tìm thấy thiết bị phù hợp với bộ lọc
                    </td>
                </tr>
            `;
        } else {
            const rowsHtml = deviceList.map((device, index) => {
                // Tỷ lệ tiêu thụ của thiết bị so với tổng điện năng
                const ratioPct = totalKwhAll > 0 
                    ? Math.min(100, (device.totalKwhMonth / totalKwhAll) * 100) 
                    : 0;

                // Xác định màu sắc thanh phần trăm
                let barClass = 'ratio-bar-fill';
                if (ratioPct >= 25) barClass += ' very-high';
                else if (ratioPct >= 15) barClass += ' high';

                return `
                    <tr>
                        <td style="text-align: center; color: var(--text-muted); font-weight: 600;">${index + 1}</td>
                        <td>
                            <div class="device-name-cell">
                                <div class="device-table-icon">
                                    <i class="${device.icon}"></i>
                                </div>
                                <div>
                                    <div class="device-table-title">
                                        <span>${device.name}</span>
                                        ${device.isEco ? '<span class="eco-tag" style="font-size: 0.68rem; padding: 1px 6px;"><i class="fas fa-leaf"></i> Eco</span>' : ''}
                                    </div>
                                    <div style="font-size: 0.74rem; color: var(--text-muted);">
                                        Định mức: ${device.powerNominal}W
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="device-room-cell">
                                <i class="${device.roomIcon} room-icon-sub"></i>
                                ${device.roomName}
                            </span>
                        </td>
                        <td class="text-right">
                            <span class="device-status-badge ${device.status ? 'on' : 'off'}">
                                <span class="status-dot"></span>
                                ${device.status ? `${device.powerCurrent} W` : '0 W (Tắt)'}
                            </span>
                        </td>
                        <td class="text-right">
                            <span class="kwh-number">${device.totalKwhMonth.toFixed(3)}</span>
                            <span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 2px;">kWh</span>
                        </td>
                        <td class="text-right">
                            <div class="ratio-cell-wrap">
                                <div class="ratio-bar-track" title="Tỷ lệ: ${ratioPct.toFixed(1)}%">
                                    <div class="${barClass}" style="width: ${ratioPct}%;"></div>
                                </div>
                                <span class="ratio-pct-text">${ratioPct.toFixed(1)}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
        }

        // 6. Render dòng tổng kết (Footer)
        if (tfoot) {
            const activeWatts = deviceList.filter(d => d.status).reduce((s, d) => s + d.powerCurrent, 0);
            const subtotalKwh = deviceList.reduce((s, d) => s + d.totalKwhMonth, 0);
            const totalRatio = totalKwhAll > 0 ? ((subtotalKwh / totalKwhAll) * 100).toFixed(1) : '100.0';

            tfoot.innerHTML = `
                <tr>
                    <td colspan="3">
                        <i class="fas fa-calculator" style="color: var(--primary); margin-right: 6px;"></i>
                        Tổng cộng: ${deviceList.length} thiết bị (${deviceList.filter(d => d.status).length} đang bật)
                    </td>
                    <td class="text-right">
                        <span style="color: var(--primary); font-family: monospace;">${activeWatts.toLocaleString('vi-VN')} W</span>
                    </td>
                    <td class="text-right">
                        <span style="color: var(--success); font-family: monospace; font-size: 0.96rem;">${subtotalKwh.toFixed(3)} kWh</span>
                    </td>
                    <td class="text-right">
                        <span style="font-family: monospace; color: var(--text-primary);">${totalRatio}%</span>
                    </td>
                </tr>
            `;
        }
    }
};

/**
 * MODULE QUẢN LÝ BIỂU ĐỒ CHART.JS (PHÚT, GIỜ, NGÀY, THÁNG)
 */
const StatsChartManager = {
    init() {
        this.createCharts();
        this.updateNoticeBanner();
        this.updateChartsData();
    },

    /**
     * Khởi tạo 2 biểu đồ Chart.js (Điện năng kWh và Chi phí VNĐ)
     */
    createCharts() {
        if (typeof Chart === 'undefined') {
            console.error('[Statistics] Chart.js chưa được tải!');
            return;
        }

        // Tùy biến font và màu sắc chung cho Chart.js
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        const ctxEnergy = document.getElementById('canvas-energy');
        const ctxCost = document.getElementById('canvas-cost');

        // BIỂU ĐỒ 1: ĐIỆN NĂNG (KWH)
        if (ctxEnergy) {
            this.chartEnergy = new Chart(ctxEnergy, {
                type: StatsState.chartType,
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Điện năng (kWh)',
                        data: [],
                        borderColor: '#38bdf8',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 260);
                            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
                            gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
                            return gradient;
                        },
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#38bdf8',
                        pointBorderColor: '#0b1120',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleColor: '#f8fafc',
                            bodyColor: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                                label: (context) => `⚡ Tiêu thụ: ${context.parsed.y.toFixed(4)} kWh`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { maxRotation: 0, font: { size: 11 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.06)' },
                            ticks: {
                                font: { size: 11 },
                                callback: (val) => `${val} kWh`
                            }
                        }
                    }
                }
            });
        }

        // BIỂU ĐỒ 2: CHI PHÍ (VNĐ)
        if (ctxCost) {
            this.chartCost = new Chart(ctxCost, {
                type: StatsState.chartType,
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Chi phí (VNĐ)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 260);
                            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
                            gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
                            return gradient;
                        },
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#0b1120',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleColor: '#f8fafc',
                            bodyColor: '#f59e0b',
                            borderColor: 'rgba(245, 158, 11, 0.3)',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                                label: (context) => `💰 Tiền điện: ${formatVND(context.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { maxRotation: 0, font: { size: 11 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.06)' },
                            ticks: {
                                font: { size: 11 },
                                callback: (val) => `${val.toLocaleString('vi-VN')} đ`
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Cập nhật dữ liệu cho biểu đồ theo mốc thời gian đang chọn:
     * - Phút: Theo dõi điện năng và chi phí thay đổi theo từng phút.
     * - Giờ: Thống kê điện năng và chi phí theo từng giờ.
     * - Ngày: Thống kê điện năng và chi phí theo từng ngày.
     * - Tháng: Thống kê tổng điện năng và chi phí theo từng tháng.
     *
     * Yêu cầu: Không tạo số liệu giả, hiển thị đúng khoảng thời gian có dữ liệu thực tế!
     */
    updateChartsData() {
        if (!this.chartEnergy || !this.chartCost) return;

        const history = (typeof SharedStorage !== 'undefined') ? SharedStorage.loadHistory() : null;
        if (!history || !history.buckets) return;

        let labels = [];
        let kwhData = [];
        let costData = [];

        const interval = StatsState.currentInterval;

        if (interval === 'minute') {
            // THỐNG KÊ THEO PHÚT
            const minutes = history.buckets.minutes || [];
            if (minutes.length > 0) {
                labels = minutes.map(m => m.label);
                kwhData = minutes.map(m => Number(m.deltaKwh.toFixed(4)));
                costData = minutes.map(m => m.deltaCost);
            }
        } else if (interval === 'hour') {
            // THỐNG KÊ THEO GIỜ
            const hours = history.buckets.hours || [];
            if (hours.length > 0) {
                labels = hours.map(h => h.label);
                kwhData = hours.map(h => Number(h.deltaKwh.toFixed(3)));
                costData = hours.map(h => h.deltaCost);
            }
        } else if (interval === 'day') {
            // THỐNG KÊ THEO NGÀY
            const days = history.buckets.days || [];
            if (days.length > 0) {
                labels = days.map(d => d.label);
                kwhData = days.map(d => Number(d.deltaKwh.toFixed(3)));
                costData = days.map(d => d.deltaCost);
            }
        } else if (interval === 'month') {
            // THỐNG KÊ THEO THÁNG (Tổng sản lượng và chi phí lũy kế)
            const months = history.buckets.months || [];
            if (months.length > 0) {
                labels = months.map(m => m.label);
                kwhData = months.map(m => Number(m.totalKwh.toFixed(3)));
                costData = months.map(m => m.totalCost);
            }
        }

        // Cập nhật dữ liệu vào Chart 1 (Điện năng)
        this.chartEnergy.data.labels = labels;
        this.chartEnergy.data.datasets[0].data = kwhData;
        this.chartEnergy.update('none');

        // Cập nhật dữ liệu vào Chart 2 (Chi phí)
        this.chartCost.data.labels = labels;
        this.chartCost.data.datasets[0].data = costData;
        this.chartCost.update('none');

        // Cập nhật thông tin thống kê tóm tắt dưới biểu đồ
        this.renderChartFooters(kwhData, costData);
    },

    /**
     * Tính toán tổng, trung bình, đỉnh (peak) dưới mỗi biểu đồ
     */
    renderChartFooters(kwhData, costData) {
        const count = kwhData.length;

        // Thống kê kWh
        const kwhSum = kwhData.reduce((s, v) => s + v, 0);
        const kwhAvg = count > 0 ? (kwhSum / count) : 0;
        const kwhPeak = count > 0 ? Math.max(...kwhData) : 0;

        const elKwhBadge = document.getElementById('kwh-sum-val');
        const elKwhAvg = document.getElementById('kwh-avg-val');
        const elKwhPeak = document.getElementById('kwh-peak-val');
        const elKwhCount = document.getElementById('kwh-points-count');

        if (elKwhBadge) elKwhBadge.textContent = `${kwhSum.toFixed(3)} kWh`;
        if (elKwhAvg) elKwhAvg.textContent = `${kwhAvg.toFixed(4)} kWh`;
        if (elKwhPeak) elKwhPeak.textContent = `${kwhPeak.toFixed(4)} kWh`;
        if (elKwhCount) elKwhCount.textContent = `${count} mốc`;

        // Thống kê Chi phí
        const costSum = costData.reduce((s, v) => s + v, 0);
        const costAvg = count > 0 ? Math.round(costSum / count) : 0;
        const costPeak = count > 0 ? Math.max(...costData) : 0;

        const elCostBadge = document.getElementById('cost-sum-val');
        const elCostAvg = document.getElementById('cost-avg-val');
        const elCostPeak = document.getElementById('cost-peak-val');
        const elCostCount = document.getElementById('cost-points-count');

        if (elCostBadge) elCostBadge.textContent = formatVND(costSum);
        if (elCostAvg) elCostAvg.textContent = formatVND(costAvg);
        if (elCostPeak) elCostPeak.textContent = formatVND(costPeak);
        if (elCostCount) elCostCount.textContent = `${count} mốc`;
    },

    /**
     * Cập nhật nội dung thông báo khoảng thời gian thực tế
     * Tuân thủ quy định: Không bịa dữ liệu giả, giải thích rõ trạng thái mô phỏng.
     */
    updateNoticeBanner() {
        const elTitle = document.getElementById('notice-title');
        const elDesc = document.getElementById('notice-desc');
        const elMeta = document.getElementById('meta-samples-text');
        const elDescKwh = document.getElementById('chart-kwh-desc');
        const elDescCost = document.getElementById('chart-cost-desc');

        const history = (typeof SharedStorage !== 'undefined') ? SharedStorage.loadHistory() : null;
        const samplesCount = history ? history.samplesCount : 0;

        if (elMeta) elMeta.textContent = `${samplesCount} mẫu đo`;

        switch (StatsState.currentInterval) {
            case 'minute':
                if (elTitle) elTitle.textContent = 'Đang thống kê theo Phút:';
                if (elDesc) elDesc.textContent = 'Theo dõi điện năng và chi phí thay đổi theo từng phút. Cột biểu đồ sẽ mở rộng theo thời gian thực khi mỗi phút trôi qua.';
                if (elDescKwh) elDescKwh.textContent = 'Sản lượng điện tiêu thụ trong từng phút (kWh)';
                if (elDescCost) elDescCost.textContent = 'Chi phí điện tương ứng từng phút theo bậc thang EVN (VNĐ)';
                break;
            case 'hour':
                if (elTitle) elTitle.textContent = 'Đang thống kê theo Giờ:';
                if (elDesc) elDesc.textContent = 'Thống kê lượng điện năng tiêu thụ và chi phí phát sinh trong từng khung giờ. Chỉ hiển thị các giờ có dữ liệu thực tế từ hệ thống mô phỏng.';
                if (elDescKwh) elDescKwh.textContent = 'Sản lượng điện tiêu thụ trong từng khung giờ (kWh)';
                if (elDescCost) elDescCost.textContent = 'Chi phí điện phát sinh trong từng khung giờ (VNĐ)';
                break;
            case 'day':
                if (elTitle) elTitle.textContent = 'Đang thống kê theo Ngày:';
                if (elDesc) elDesc.textContent = 'Thống kê lượng điện tiêu thụ và chi phí theo từng ngày. Dữ liệu các ngày sẽ được tích lũy liên tục và lưu trữ an toàn trong trình duyệt.';
                if (elDescKwh) elDescKwh.textContent = 'Sản lượng điện tiêu thụ theo ngày (kWh)';
                if (elDescCost) elDescCost.textContent = 'Tổng chi phí tiền điện theo từng ngày (VNĐ)';
                break;
            case 'month':
                if (elTitle) elTitle.textContent = 'Đang thống kê theo Tháng:';
                if (elDesc) elDesc.textContent = 'Thống kê tổng điện năng tiêu thụ và chi phí lũy kế của tháng hiện tại tính theo đúng Biểu giá bán lẻ điện sinh hoạt 6 bậc EVN và VAT 8%.';
                if (elDescKwh) elDescKwh.textContent = 'Tổng sản lượng điện lũy kế của tháng (kWh)';
                if (elDescCost) elDescCost.textContent = 'Tổng tiền điện hóa đơn tháng phát sinh đến thời điểm hiện tại (VNĐ)';
                break;
        }
    },

    /**
     * Chuyển đổi mốc thời gian (Phút / Giờ / Ngày / Tháng)
     */
    setInterval(newInterval) {
        StatsState.currentInterval = newInterval;
        this.updateNoticeBanner();
        this.updateChartsData();
    },

    /**
     * Đổi chế độ xem biểu đồ (Cả 2 / Chỉ kWh / Chỉ Tiền)
     */
    setView(viewMode) {
        StatsState.currentView = viewMode;
        const grid = document.getElementById('charts-grid');
        const cardKwh = document.getElementById('chart-card-kwh');
        const cardCost = document.getElementById('chart-card-cost');

        if (!grid || !cardKwh || !cardCost) return;

        if (viewMode === 'both') {
            cardKwh.style.display = 'flex';
            cardCost.style.display = 'flex';
            grid.classList.remove('view-single');
        } else if (viewMode === 'kwh') {
            cardKwh.style.display = 'flex';
            cardCost.style.display = 'none';
            grid.classList.add('view-single');
        } else if (viewMode === 'cost') {
            cardKwh.style.display = 'none';
            cardCost.style.display = 'flex';
            grid.classList.add('view-single');
        }

        if (this.chartEnergy) this.chartEnergy.resize();
        if (this.chartCost) this.chartCost.resize();
    },

    /**
     * Đổi kiểu biểu đồ giữa Đường (Line) và Cột (Bar)
     */
    setChartType(type) {
        StatsState.chartType = type;
        if (this.chartEnergy) {
            this.chartEnergy.destroy();
            this.chartEnergy = null;
        }
        if (this.chartCost) {
            this.chartCost.destroy();
            this.chartCost = null;
        }
        this.createCharts();
        this.updateChartsData();
    }
};

/**
 * MODULE XỬ LÝ SỰ KIỆN & TƯƠNG TÁC NGƯỜI DÙNG
 */
const StatsEvents = {
    bind() {
        // 1. Chuyển đổi 4 nút thời gian: Phút, Giờ, Ngày, Tháng
        const timeButtons = document.querySelectorAll('.time-tab-btn');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                timeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const interval = btn.getAttribute('data-interval');
                StatsChartManager.setInterval(interval);
                this.showToast(`Đã chuyển sang thống kê theo: ${btn.textContent.trim()}`);
            });
        });

        // 2. Chuyển đổi chế độ xem biểu đồ (Cả 2 / Chỉ kWh / Chỉ Tiền)
        const viewButtons = document.querySelectorAll('.chart-view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.getAttribute('data-view');
                StatsChartManager.setView(view);
            });
        });

        // 3. Chuyển đổi kiểu biểu đồ (Đường / Cột)
        const typeButtons = document.querySelectorAll('.chart-type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const type = btn.getAttribute('data-type');
                StatsChartManager.setChartType(type);
                this.showToast(`Đã đổi dạng biểu đồ: ${type === 'line' ? 'Đường' : 'Cột'}`);
            });
        });

        // 4. Lọc bảng thiết bị theo phòng
        const roomFilter = document.getElementById('device-room-filter');
        if (roomFilter) {
            roomFilter.addEventListener('change', (e) => {
                StatsState.tableFilterRoom = e.target.value;
                StatsRenderer.renderDeviceTable();
            });
        }

        // 5. Ô tìm kiếm thiết bị nhanh
        const searchInput = document.getElementById('device-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                StatsState.tableSearchKeyword = e.target.value;
                StatsRenderer.renderDeviceTable();
            });
        }

        // 6. Đồng hồ hệ thống thời gian thực
        this.startLiveClock();
    },

    /**
     * Đồng hồ thời gian thực HH:mm:ss
     */
    startLiveClock() {
        const clockEl = document.getElementById('live-clock');
        const update = () => {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            if (clockEl) clockEl.textContent = timeStr;
        };
        update();
        setInterval(update, 1000);
    },

    /**
     * Hiển thị thông báo Toast nổi
     */
    showToast(message) {
        const toast = document.getElementById('app-toast');
        const toastMsg = document.getElementById('toast-message');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.className = 'toast-notification toast-success show';

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }
};

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    StatsDataManager.init();
    StatsRenderer.renderAll();
    StatsChartManager.init();
    StatsEvents.bind();
});

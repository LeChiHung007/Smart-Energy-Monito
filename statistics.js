/**
 * ==========================================================================
 * STATISTICS.JS - LOGIC XỬ LÝ TRANG THỐNG KÊ CHI TIẾT ĐIỆN NĂNG (REALTIME ENGINE)
 * Dự án: Smart Energy Monitor (hethonggiamsatdiennang.vn)
 * Tính năng chính:
 * 1. Đồng bộ hoàn toàn với điện năng sử dụng và số tiền cần trả từ Dashboard.
 * 2. Chạy theo thời gian thực (Realtime Ticker Engine 1000ms), nhảy số liên tục.
 * 3. Thống kê đa chu kỳ theo: PHÚT, NGÀY, THÁNG, NĂM.
 * 4. Tự động cập nhật Biểu đồ đường, Biểu đồ tròn, Bảng thiết bị & LED xung.
 * ==========================================================================
 */
'use strict';

// Định dạng tiền tệ VNĐ
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount || 0));
}

// Cấu hình màu sắc đồng bộ hệ thống cho các phòng
const ROOM_META = {
    'living-room': {
        name: 'Phòng khách',
        color: '#38bdf8', // Sky 400
        bgColor: 'rgba(56, 189, 248, 0.15)',
        icon: 'fas fa-couch'
    },
    'kitchen': {
        name: 'Phòng bếp & Ăn',
        color: '#f59e0b', // Amber 500
        bgColor: 'rgba(245, 158, 11, 0.15)',
        icon: 'fas fa-utensils'
    },
    'bedroom-master': {
        name: 'Phòng ngủ Master',
        color: '#818cf8', // Indigo 400
        bgColor: 'rgba(129, 140, 248, 0.15)',
        icon: 'fas fa-bed'
    },
    'bathroom-laundry': {
        name: 'Phòng tắm & Giặt đồ',
        color: '#10b981', // Emerald 500
        bgColor: 'rgba(16, 185, 129, 0.15)',
        icon: 'fas fa-bath'
    }
};

/**
 * MODULE QUẢN LÝ THỐNG KÊ CHI TIẾT (STATISTICS CONTROLLER)
 */
const StatisticsApp = {
    // State hệ thống đồng bộ từ EnergyDataStore
    state: null,
    allDevices: [],
    totalKwhMonth: 0,
    currentPowerWatts: 0,
    roomStats: {},

    // Chu kỳ biểu đồ đang xem ('minute' | 'day' | 'month' | 'year')
    currentPeriod: 'minute',

    // Đối tượng biểu đồ Chart.js
    lineChartInstance: null,
    doughnutChartInstance: null,

    // Bộ lọc bảng thiết bị
    tableFilter: {
        room: 'all',
        keyword: ''
    },

    // Vòng lặp Realtime Simulation
    simulation: {
        intervalId: null,
        intervalMs: 1000
    },

    /**
     * Khởi chạy module thống kê
     */
    init() {
        this.loadSharedData();
        this.renderOverviewMetrics(false);
        this.renderPeriodCards();
        this.initCharts();
        this.renderDeviceTable();
        this.bindEvents();
        this.startLiveClock();
        this.startMeterPulse();
        this.startRealtimeEngine();
    },

    /**
     * Tải và chuẩn hóa dữ liệu từ EnergyDataStore (đồng bộ với Dashboard)
     */
    loadSharedData() {
        if (typeof EnergyDataStore !== 'undefined') {
            this.state = EnergyDataStore.loadState();
        } else {
            this.state = {
                rooms: JSON.parse(JSON.stringify(INITIAL_DATA.rooms)),
                household: { ...INITIAL_DATA.household },
                evnTariffTiers: [...INITIAL_DATA.evnTariffTiers],
                vatRate: INITIAL_DATA.vatRate,
                speedMultiplier: 60
            };
        }
        this.syncDerivedData();
    },

    /**
     * Chuẩn hóa và đồng bộ các số liệu phái sinh (allDevices, roomStats, totalKwhMonth) từ this.state
     */
    syncDerivedData() {
        this.allDevices = [];
        this.roomStats = {};
        this.currentPowerWatts = 0;

        if (!this.state || !this.state.rooms) return;

        this.state.rooms.forEach(room => {
            const rMeta = ROOM_META[room.id] || { name: room.name, color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)', icon: room.icon };
            let roomTotalKwh = 0;
            let roomActiveWatts = 0;

            room.devices.forEach(device => {
                roomTotalKwh += (device.totalKwhMonth || 0);
                if (device.status) {
                    roomActiveWatts += (device.powerCurrent || 0);
                }

                this.allDevices.push({
                    ...device,
                    roomId: room.id,
                    roomName: rMeta.name,
                    roomColor: rMeta.color,
                    roomIcon: rMeta.icon
                });
            });

            this.currentPowerWatts += roomActiveWatts;

            this.roomStats[room.id] = {
                id: room.id,
                name: rMeta.name,
                color: rMeta.color,
                bgColor: rMeta.bgColor,
                icon: rMeta.icon,
                kwh: roomTotalKwh,
                activeWatts: roomActiveWatts,
                deviceCount: room.devices.length
            };
        });

        // Tổng điện năng tích lũy toàn bộ gia đình
        this.totalKwhMonth = this.allDevices.reduce((sum, d) => sum + (d.totalKwhMonth || 0), 0);

        // Tính % tỷ trọng tiêu thụ cho từng thiết bị và từng phòng
        this.allDevices.forEach(d => {
            d.sharePercent = this.totalKwhMonth > 0 ? ((d.totalKwhMonth || 0) / this.totalKwhMonth) * 100 : 0;
        });

        Object.values(this.roomStats).forEach(r => {
            r.sharePercent = this.totalKwhMonth > 0 ? (r.kwh / this.totalKwhMonth) * 100 : 0;
        });
    },

    /**
     * Render 4 thẻ KPI chỉ số tổng quan (có hiệu ứng nhấp nháy cập nhật thời gian thực)
     */
    renderOverviewMetrics(animate = false) {
        // 1. Tổng điện năng tiêu thụ (kWh)
        const elTotalKwh = document.getElementById('stat-total-kwh');
        if (elTotalKwh) {
            elTotalKwh.textContent = this.totalKwhMonth.toFixed(3);
            if (animate && this.currentPowerWatts > 0) {
                elTotalKwh.classList.add('value-update');
                setTimeout(() => elTotalKwh.classList.remove('value-update'), 350);
            }
        }

        // 2. Tổng tiền điện (Tính chính xác theo biểu giá 6 bậc EVN + VAT 8%)
        const tiers = (this.state && this.state.evnTariffTiers) || INITIAL_DATA.evnTariffTiers;
        const vat = (this.state && this.state.vatRate) || INITIAL_DATA.vatRate;
        const billCalculation = EnergyCalculator.calculateTieredBill(this.totalKwhMonth, tiers, vat);

        const elTotalBill = document.getElementById('stat-total-bill');
        if (elTotalBill) {
            elTotalBill.textContent = formatVND(billCalculation.totalWithVat);
            if (animate && this.currentPowerWatts > 0) {
                elTotalBill.classList.add('value-update');
                setTimeout(() => elTotalBill.classList.remove('value-update'), 350);
            }
        }

        // 3. Công suất tức thời (kW) & tiêu thụ trung bình
        const elCurrentPower = document.getElementById('stat-current-power');
        const elAvgSubtext = document.getElementById('stat-avg-subtext');
        if (elCurrentPower) {
            elCurrentPower.textContent = (this.currentPowerWatts / 1000).toFixed(2);
        }
        if (elAvgSubtext) {
            const avgDailyKwh = this.totalKwhMonth / 30;
            const avgDailyCost = Math.round(billCalculation.totalWithVat / 30);
            elAvgSubtext.textContent = `TB: ${avgDailyKwh.toFixed(2)} kWh/ngày (~${formatVND(avgDailyCost)})`;
        }

        // 4. Thiết bị tiêu thụ điện nhiều nhất
        let topDevice = null;
        if (this.allDevices.length > 0) {
            topDevice = [...this.allDevices].sort((a, b) => (b.totalKwhMonth || 0) - (a.totalKwhMonth || 0))[0];
        }

        const elTopDeviceName = document.getElementById('stat-top-device-name');
        const elTopDeviceInfo = document.getElementById('stat-top-device-info');
        if (topDevice) {
            if (elTopDeviceName) {
                elTopDeviceName.textContent = topDevice.name;
            }
            if (elTopDeviceInfo) {
                elTopDeviceInfo.innerHTML = `
                    <i class="${topDevice.icon}"></i>
                    <span>${topDevice.totalKwhMonth.toFixed(2)} kWh (${topDevice.sharePercent.toFixed(1)}%) • ${topDevice.roomName}</span>
                `;
            }
        }
    },

    /**
     * Render các thẻ thống kê đa chu kỳ: Theo Phút - Ngày - Tháng - Năm
     */
    renderPeriodCards() {
        const tiers = (this.state && this.state.evnTariffTiers) || INITIAL_DATA.evnTariffTiers;
        const vat = (this.state && this.state.vatRate) || INITIAL_DATA.vatRate;

        // --- 1. THEO PHÚT ---
        // Điện năng tức thời tiêu thụ trong 1 phút = (Tổng Watts / 1000) / 60
        const minuteKwh = (this.currentPowerWatts / 60000);
        // Chi phí ước tính 1 phút (theo đơn giá bình quân ~2.376 đ/kWh gồm VAT)
        const minuteCost = Math.round(minuteKwh * 2200 * (1 + vat));

        const elMinKwh = document.getElementById('p-minute-kwh');
        const elMinCost = document.getElementById('p-minute-cost');
        const elMinDesc = document.getElementById('p-minute-desc');
        if (elMinKwh) elMinKwh.textContent = minuteKwh.toFixed(4);
        if (elMinCost) elMinCost.textContent = `${formatVND(minuteCost)}/phút`;
        if (elMinDesc) {
            const activeCount = this.allDevices.filter(d => d.status).length;
            elMinDesc.textContent = `${activeCount} thiết bị đang chạy • ${(this.currentPowerWatts / 1000).toFixed(2)} kW`;
        }

        // --- 2. THEO NGÀY ---
        // Sản lượng hôm nay từ history
        let history = null;
        if (typeof EnergyDataStore !== 'undefined') {
            history = EnergyDataStore.loadHistory(this.totalKwhMonth);
        }
        const todayKwh = (history && history.day && history.day.data.length > 0)
            ? history.day.data[history.day.data.length - 1]
            : (this.totalKwhMonth / 30);
        const todayCost = Math.round(todayKwh * 2200 * (1 + vat));

        const elDayKwh = document.getElementById('p-day-kwh');
        const elDayCost = document.getElementById('p-day-cost');
        if (elDayKwh) elDayKwh.textContent = todayKwh.toFixed(2);
        if (elDayCost) elDayCost.textContent = `${formatVND(todayCost)}/ngày`;

        // --- 3. THEO THÁNG ---
        // Chu kỳ tháng hiện tại (Tháng 11) tính đúng theo bậc thang EVN 6 bậc
        const monthBill = EnergyCalculator.calculateTieredBill(this.totalKwhMonth, tiers, vat);
        const elMonthKwh = document.getElementById('p-month-kwh');
        const elMonthCost = document.getElementById('p-month-cost');
        if (elMonthKwh) elMonthKwh.textContent = this.totalKwhMonth.toFixed(2);
        if (elMonthCost) elMonthCost.textContent = `${formatVND(monthBill.totalWithVat)}/tháng`;

        // --- 4. THEO NĂM ---
        // Lũy kế cả năm 2026 từ history
        const yearKwh = (history && history.year && history.year.data.length > 0)
            ? history.year.data[history.year.data.length - 1]
            : (this.totalKwhMonth * 12);
        // Chi phí năm ước tính
        const yearCost = Math.round(yearKwh * 2450 * (1 + vat));
        const elYearKwh = document.getElementById('p-year-kwh');
        const elYearCost = document.getElementById('p-year-cost');
        if (elYearKwh) elYearKwh.textContent = yearKwh.toFixed(1);
        if (elYearCost) elYearCost.textContent = `${formatVND(yearCost)}/năm`;
    },

    /**
     * Khởi tạo các biểu đồ Chart.js (Line Chart & Doughnut Chart)
     */
    initCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Thư viện Chart.js chưa sẵn sàng.');
            return;
        }

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        this.initLineChart();
        this.initDoughnutChart();
    },

    /**
     * Khởi tạo Biểu đồ đường (Line Chart) hỗ trợ 4 chế độ: phút, ngày, tháng, năm
     */
    initLineChart() {
        const ctx = document.getElementById('lineChart');
        if (!ctx) return;

        let history = null;
        if (typeof EnergyDataStore !== 'undefined') {
            history = EnergyDataStore.loadHistory(this.totalKwhMonth);
        } else {
            history = EnergyDataStore.createDefaultHistory(this.totalKwhMonth);
        }

        const periodConfig = history[this.currentPeriod] || history.minute;

        const canvas = ctx.getContext('2d');
        const gradient = canvas.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.00)');

        this.lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [...periodConfig.labels],
                datasets: [{
                    label: periodConfig.periodLabel,
                    data: [...periodConfig.data],
                    borderColor: '#38bdf8',
                    borderWidth: 2.5,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#38bdf8',
                    pointBorderColor: '#0b1120',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#38bdf8',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 400
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#151f32',
                        titleColor: '#f8fafc',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y;
                                const period = this.currentPeriod;
                                let cost = 0;
                                if (period === 'minute') {
                                    cost = Math.round(val * 2200 * 1.08);
                                } else if (period === 'day') {
                                    cost = Math.round(val * 2200 * 1.08);
                                } else if (period === 'month') {
                                    const tiers = (this.state && this.state.evnTariffTiers) || INITIAL_DATA.evnTariffTiers;
                                    const vat = (this.state && this.state.vatRate) || INITIAL_DATA.vatRate;
                                    cost = EnergyCalculator.calculateTieredBill(val, tiers, vat).totalWithVat;
                                } else {
                                    cost = Math.round(val * 2450 * 1.08);
                                }

                                return [
                                    ` Điện năng: ${val.toFixed(period === 'minute' ? 4 : 2)} kWh`,
                                    ` Chi phí tương ứng: ${formatVND(cost)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: function(value) {
                                return value + ' kWh';
                            }
                        }
                    }
                }
            }
        });

        this.updateLineChartSummary(this.currentPeriod);
    },

    /**
     * Chuyển đổi chu kỳ hiển thị của Line Chart (phút / ngày / tháng / năm)
     */
    switchPeriod(period) {
        this.currentPeriod = period;

        // Cập nhật trạng thái Active trên các nút Tab
        const tabs = document.querySelectorAll('.chart-tab-btn');
        tabs.forEach(btn => {
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Cập nhật trạng thái Active trên 4 Thẻ chu kỳ
        const cards = document.querySelectorAll('.period-metric-card');
        cards.forEach(card => {
            if (card.getAttribute('data-period') === period) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Cập nhật tiêu đề biểu đồ
        const titleEl = document.getElementById('chart-main-title');
        const subtitleEl = document.getElementById('chart-main-subtitle');
        const titlesMap = {
            minute: {
                title: 'Biểu đồ điện năng tiêu thụ theo phút (Thời gian thực)',
                sub: 'Theo dõi phụ tải điện và chi phí tương ứng nhảy số từng giây'
            },
            day: {
                title: 'Biểu đồ điện năng tiêu thụ theo ngày (7 ngày gần nhất)',
                sub: 'Sản lượng điện tiêu thụ từng ngày và biến động chi phí'
            },
            month: {
                title: 'Biểu đồ điện năng tiêu thụ theo tháng (12 tháng năm 2026)',
                sub: 'Chu kỳ hóa đơn 12 tháng tính theo biểu giá bậc thang EVN'
            },
            year: {
                title: 'Biểu đồ sản lượng điện tiêu thụ theo năm',
                sub: 'Xu hướng phụ tải và chi phí năng lượng qua các năm gần đây'
            }
        };

        if (titleEl && titlesMap[period]) titleEl.textContent = titlesMap[period].title;
        if (subtitleEl && titlesMap[period]) subtitleEl.textContent = titlesMap[period].sub;

        // Cập nhật dữ liệu trên Chart.js
        if (this.lineChartInstance && typeof EnergyDataStore !== 'undefined') {
            const history = EnergyDataStore.loadHistory(this.totalKwhMonth);
            const cfg = history[period];
            if (cfg) {
                this.lineChartInstance.data.labels = [...cfg.labels];
                this.lineChartInstance.data.datasets[0].data = [...cfg.data];
                this.lineChartInstance.data.datasets[0].label = cfg.periodLabel;
                this.lineChartInstance.update();
            }
        }

        this.updateLineChartSummary(period);
    },

    /**
     * Cập nhật thanh tóm tắt phụ tải bên dưới biểu đồ (Peak, Low, Avg kèm số tiền VNĐ)
     */
    updateLineChartSummary(period) {
        if (typeof EnergyDataStore === 'undefined') return;
        const history = EnergyDataStore.loadHistory(this.totalKwhMonth);
        const cfg = history[period];
        if (!cfg || !cfg.data || cfg.data.length === 0) return;

        const data = cfg.data;
        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const avgVal = data.reduce((s, v) => s + v, 0) / (data.length || 1);

        const maxIndex = data.indexOf(maxVal);
        const minIndex = data.indexOf(minVal);

        const calcCost = (val) => {
            if (period === 'minute' || period === 'day') {
                return Math.round(val * 2200 * 1.08);
            }
            if (period === 'month') {
                const tiers = (this.state && this.state.evnTariffTiers) || INITIAL_DATA.evnTariffTiers;
                const vat = (this.state && this.state.vatRate) || INITIAL_DATA.vatRate;
                return EnergyCalculator.calculateTieredBill(val, tiers, vat).totalWithVat;
            }
            return Math.round(val * 2450 * 1.08);
        };

        const maxCost = calcCost(maxVal);
        const minCost = calcCost(minVal);
        const avgCost = calcCost(avgVal);

        const elPeak = document.getElementById('stat-peak-val');
        const elPeakLabel = document.getElementById('stat-peak-label');
        const elPeakCost = document.getElementById('stat-peak-cost');

        const elLow = document.getElementById('stat-low-val');
        const elLowLabel = document.getElementById('stat-low-label');
        const elLowCost = document.getElementById('stat-low-cost');

        const elAvg = document.getElementById('stat-chart-avg-val');
        const elAvgCost = document.getElementById('stat-chart-avg-cost');

        const unit = period === 'minute' ? 'kWh' : 'kWh';
        const dec = period === 'minute' ? 4 : 2;

        if (elPeak) elPeak.textContent = `${maxVal.toFixed(dec)} ${unit}`;
        if (elPeakLabel) elPeakLabel.textContent = `Cao nhất (${cfg.labels[maxIndex] || ''})`;
        if (elPeakCost) elPeakCost.textContent = `~ ${formatVND(maxCost)}`;

        if (elLow) elLow.textContent = `${minVal.toFixed(dec)} ${unit}`;
        if (elLowLabel) elLowLabel.textContent = `Thấp nhất (${cfg.labels[minIndex] || ''})`;
        if (elLowCost) elLowCost.textContent = `~ ${formatVND(minCost)}`;

        if (elAvg) elAvg.textContent = `${avgVal.toFixed(dec)} ${unit}`;
        if (elAvgCost) elAvgCost.textContent = `~ ${formatVND(avgCost)}`;
    },

    /**
     * Khởi tạo Biểu đồ tròn theo phòng (Doughnut Chart)
     */
    initDoughnutChart() {
        const ctx = document.getElementById('roomDoughnutChart');
        if (!ctx) return;

        const roomOrder = ['living-room', 'kitchen', 'bedroom-master', 'bathroom-laundry'];
        const labels = roomOrder.map(id => this.roomStats[id]?.name || id);
        const data = roomOrder.map(id => Number((this.roomStats[id]?.kwh || 0).toFixed(2)));
        const colors = roomOrder.map(id => this.roomStats[id]?.color || '#38bdf8');

        this.doughnutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#151f32',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                animation: {
                    duration: 300
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#151f32',
                        titleColor: '#f8fafc',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed;
                                const percent = this.totalKwhMonth > 0 ? ((val / this.totalKwhMonth) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val.toFixed(2)} kWh (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        this.renderRoomLegend(roomOrder);
    },

    /**
     * Cập nhật số liệu Doughnut Chart và Legend phòng thời gian thực
     */
    updateDoughnutChartRealtime() {
        const roomOrder = ['living-room', 'kitchen', 'bedroom-master', 'bathroom-laundry'];
        const newData = roomOrder.map(id => Number((this.roomStats[id]?.kwh || 0).toFixed(2)));

        if (this.doughnutChartInstance) {
            this.doughnutChartInstance.data.datasets[0].data = newData;
            this.doughnutChartInstance.update('none'); // Không chạy animation lại để tránh chớp mắt
        }

        // Cập nhật các con số trong danh sách Legend
        roomOrder.forEach(roomId => {
            const room = this.roomStats[roomId];
            if (!room) return;
            const itemEl = document.querySelector(`.room-breakdown-item[data-room-id="${roomId}"]`);
            if (itemEl) {
                const kwhEl = itemEl.querySelector('.room-item-kwh');
                const percentEl = itemEl.querySelector('.room-item-percent');
                if (kwhEl) kwhEl.textContent = `${room.kwh.toFixed(2)} kWh`;
                if (percentEl) percentEl.textContent = `${room.sharePercent.toFixed(1)}%`;
            }
        });
    },

    /**
     * Render danh sách phòng và số liệu phân bổ bên dưới biểu đồ Doughnut
     */
    renderRoomLegend(roomOrder) {
        const container = document.getElementById('roomBreakdownList');
        if (!container) return;

        const html = roomOrder.map(roomId => {
            const room = this.roomStats[roomId];
            if (!room) return '';
            return `
                <div class="room-breakdown-item" data-room-id="${room.id}">
                    <div class="room-item-left">
                        <span class="room-color-dot" style="background-color: ${room.color}; box-shadow: 0 0 8px ${room.color};"></span>
                        <span class="room-item-name"><i class="${room.icon}" style="color: ${room.color}; margin-right: 6px;"></i>${room.name}</span>
                    </div>
                    <div class="room-item-right">
                        <span class="room-item-kwh">${room.kwh.toFixed(2)} kWh</span>
                        <span class="room-item-percent" style="color: ${room.color}; background-color: ${room.bgColor};">${room.sharePercent.toFixed(1)}%</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render Bảng thống kê thiết bị
     * Sắp xếp theo mức tiêu thụ từ cao xuống thấp
     */
    renderDeviceTable() {
        const tbody = document.getElementById('deviceTableBody');
        const countEl = document.getElementById('tableDeviceCount');
        const totalFilterKwhEl = document.getElementById('tableTotalFilteredKwh');
        if (!tbody) return;

        // Lọc theo phòng và từ khóa
        let filtered = this.allDevices.filter(dev => {
            const matchRoom = (this.tableFilter.room === 'all') || (dev.roomId === this.tableFilter.room);
            const matchKw = !this.tableFilter.keyword || dev.name.toLowerCase().includes(this.tableFilter.keyword.toLowerCase());
            return matchRoom && matchKw;
        });

        // Sắp xếp giảm dần theo kWh tiêu thụ
        filtered.sort((a, b) => (b.totalKwhMonth || 0) - (a.totalKwhMonth || 0));

        if (countEl) countEl.textContent = `${filtered.length} / ${this.allDevices.length} thiết bị`;
        const sumFilteredKwh = filtered.reduce((s, d) => s + (d.totalKwhMonth || 0), 0);
        if (totalFilterKwhEl) totalFilterKwhEl.textContent = `${sumFilteredKwh.toFixed(3)} kWh`;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table-state">
                        <i class="fas fa-magnifying-glass"></i>
                        <p>Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const rowsHtml = filtered.map((device, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            let barTier = 'tier-low';
            if (device.sharePercent >= 15) barTier = 'tier-high';
            else if (device.sharePercent >= 8) barTier = 'tier-mid';

            return `
                <tr data-device-row-id="${device.id}">
                    <td style="width: 50px; text-align: center;">
                        <span class="rank-badge ${rankClass}">#${rank}</span>
                    </td>
                    <td>
                        <div class="device-name-cell">
                            <div class="device-avatar-icon">
                                <i class="${device.icon}"></i>
                            </div>
                            <div class="device-title-info">
                                <strong>${device.name}</strong>
                                ${device.isEco ? '<span class="device-eco-label"><i class="fas fa-leaf"></i> Inverter Eco</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="room-badge room-${device.roomId}">
                            <i class="${device.roomIcon}"></i> ${device.roomName}
                        </span>
                    </td>
                    <td>
                        <div class="power-col">${device.powerNominal} W</div>
                        <div class="power-sub row-cur-power">Hiện tại: ${device.status ? (device.powerCurrent || 0) + ' W' : '0 W'}</div>
                    </td>
                    <td>
                        <span class="kwh-col row-kwh">${(device.totalKwhMonth || 0).toFixed(3)} kWh</span>
                    </td>
                    <td>
                        <div class="share-col-wrap">
                            <div class="share-numbers">
                                <span class="row-share">${device.sharePercent.toFixed(1)}%</span>
                            </div>
                            <div class="share-progress-track">
                                <div class="share-progress-bar ${barTier} row-bar" style="width: ${Math.min(100, Math.max(4, device.sharePercent * 3.5))}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="status-pill ${device.status ? 'status-on' : 'status-off'} row-status">
                            <span class="${device.status ? 'status-dot-blink' : ''}"></span>
                            ${device.status ? 'Đang bật' : 'Đang tắt'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;
    },

    /**
     * Cập nhật nhanh số liệu trong bảng thiết bị mà không phá vỡ DOM (giữ con trỏ tìm kiếm)
     */
    updateDeviceTableRealtime() {
        this.allDevices.forEach(device => {
            const row = document.querySelector(`tr[data-device-row-id="${device.id}"]`);
            if (row) {
                const curPowerEl = row.querySelector('.row-cur-power');
                const kwhEl = row.querySelector('.row-kwh');
                const shareEl = row.querySelector('.row-share');
                const barEl = row.querySelector('.row-bar');
                const statusEl = row.querySelector('.row-status');

                if (curPowerEl) {
                    curPowerEl.textContent = `Hiện tại: ${device.status ? (device.powerCurrent || 0) + ' W' : '0 W'}`;
                }
                if (kwhEl) {
                    kwhEl.textContent = `${(device.totalKwhMonth || 0).toFixed(3)} kWh`;
                }
                if (shareEl) {
                    shareEl.textContent = `${device.sharePercent.toFixed(1)}%`;
                }
                if (barEl) {
                    barEl.style.width = `${Math.min(100, Math.max(4, device.sharePercent * 3.5))}%`;
                }
                if (statusEl) {
                    statusEl.className = `status-pill ${device.status ? 'status-on' : 'status-off'} row-status`;
                    statusEl.innerHTML = `
                        <span class="${device.status ? 'status-dot-blink' : ''}"></span>
                        ${device.status ? 'Đang bật' : 'Đang tắt'}
                    `;
                }
            }
        });

        // Cập nhật tổng kWh nhóm đang lọc
        const totalFilterKwhEl = document.getElementById('tableTotalFilteredKwh');
        if (totalFilterKwhEl) {
            let filtered = this.allDevices.filter(dev => {
                const matchRoom = (this.tableFilter.room === 'all') || (dev.roomId === this.tableFilter.room);
                const matchKw = !this.tableFilter.keyword || dev.name.toLowerCase().includes(this.tableFilter.keyword.toLowerCase());
                return matchRoom && matchKw;
            });
            const sumFiltered = filtered.reduce((s, d) => s + (d.totalKwhMonth || 0), 0);
            totalFilterKwhEl.textContent = `${sumFiltered.toFixed(3)} kWh`;
        }
    },

    /**
     * VÒNG LẶP MÔ PHỎNG THỜI GIAN THỰC (REALTIME SIMULATION ENGINE)
     * Tích lũy điện năng từng giây (1000ms), đồng bộ số liệu và lưu vào EnergyDataStore
     * Chạy song song và đồng bộ 100% với giao diện chính (Dashboard)
     */
    startRealtimeEngine() {
        if (this.simulation.intervalId) {
            clearInterval(this.simulation.intervalId);
        }

        const impulseLed = document.getElementById('meter-impulse-led');

        this.simulation.intervalId = setInterval(() => {
            // Kiểm tra xem Dashboard chính (index.html) có đang mở và tích cực phát xung tick không
            const now = Date.now();
            const lastTick = (this.state && this.state.lastTick) ? this.state.lastTick : 0;
            const isDashboardActive = (now - lastTick < 2200) && (this.state && this.state.tickSource === 'dashboard');

            if (isDashboardActive) {
                // Dashboard đang chạy: Nạp dữ liệu mới nhất từ shared store để giữ khớp 100% song song
                this.loadSharedData();

                if (this.currentPowerWatts > 0 && impulseLed) {
                    impulseLed.classList.add('flash');
                    setTimeout(() => impulseLed.classList.remove('flash'), 120);
                }

                this.renderOverviewMetrics(true);
                this.renderPeriodCards();
                this.updateDoughnutChartRealtime();
                this.updateDeviceTableRealtime();
                this.updateLineChartRealtime();
                return;
            }

            // Nếu chỉ mở tab Thống kê (Dashboard không mở), tab Thống kê tự vận hành engine và lưu state
            const speed = (this.state && this.state.speedMultiplier) || 60;
            let totalActiveWatts = 0;
            let totalAddedKwh = 0;

            // Tích lũy công suất và kWh cho từng thiết bị đang bật
            this.state.rooms.forEach(room => {
                room.devices.forEach(device => {
                    if (device.status) {
                        // Dao động công suất nhẹ ±2.5%
                        const delta = (Math.random() * 0.05 - 0.025);
                        const newPower = Math.round(device.powerNominal * (0.8 + delta));
                        device.powerCurrent = Math.max(10, newPower);
                        totalActiveWatts += device.powerCurrent;

                        // kWh tích lũy theo từng giây: W * 1s * speed / 3.600.000
                        const added = (device.powerCurrent * 1 * speed) / 3600000;
                        device.totalKwhMonth = (device.totalKwhMonth || 0) + added;
                        totalAddedKwh += added;
                    }
                });
            });

            this.currentPowerWatts = totalActiveWatts;

            // Chớp đèn xung công tơ nếu có tải đang tiêu thụ
            if (totalActiveWatts > 0 && impulseLed) {
                impulseLed.classList.add('flash');
                setTimeout(() => impulseLed.classList.remove('flash'), 120);
            }

            // Đồng bộ dữ liệu phẳng và tỷ trọng
            this.syncDerivedData();

            // Ghi nhận vào EnergyDataStore để các tab khác (Dashboard) đều nhận ngay song song
            if (typeof EnergyDataStore !== 'undefined') {
                EnergyDataStore.recordLiveTick(totalAddedKwh, this.totalKwhMonth, totalActiveWatts);
                EnergyDataStore.saveState(this.state, 'statistics');
            }

            // Cập nhật giao diện theo thời gian thực
            this.renderOverviewMetrics(true);
            this.renderPeriodCards();
            this.updateDoughnutChartRealtime();
            this.updateDeviceTableRealtime();

            // Cập nhật Line Chart theo thời gian thực
            this.updateLineChartRealtime();

        }, this.simulation.intervalMs);
    },

    /**
     * Cập nhật điểm dữ liệu mới nhất trên Line Chart trong thời gian thực
     */
    updateLineChartRealtime() {
        if (!this.lineChartInstance || typeof EnergyDataStore === 'undefined') return;

        const history = EnergyDataStore.loadHistory(this.totalKwhMonth);
        const cfg = history[this.currentPeriod];
        if (!cfg) return;

        // Cập nhật labels và data mà không giật màn hình
        this.lineChartInstance.data.labels = [...cfg.labels];
        this.lineChartInstance.data.datasets[0].data = [...cfg.data];
        this.lineChartInstance.update('none');

        // Cập nhật thanh tóm tắt Peak, Low, Avg
        this.updateLineChartSummary(this.currentPeriod);
    },

    /**
     * Bắt các sự kiện tương tác của người dùng
     */
    bindEvents() {
        // 1. Sự kiện chuyển đổi chu kỳ trên các nút Tab
        const periodBtns = document.querySelectorAll('.chart-tab-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = btn.getAttribute('data-period');
                if (period) this.switchPeriod(period);
            });
        });

        // 2. Sự kiện nhấp vào 4 Thẻ chu kỳ (Phút - Ngày - Tháng - Năm)
        const periodCards = document.querySelectorAll('.period-metric-card');
        periodCards.forEach(card => {
            card.addEventListener('click', () => {
                const period = card.getAttribute('data-period');
                if (period) this.switchPeriod(period);
            });
        });

        // 3. Lọc bảng theo phòng
        const roomSelect = document.getElementById('tableRoomSelect');
        if (roomSelect) {
            roomSelect.addEventListener('change', (e) => {
                this.tableFilter.room = e.target.value;
                this.renderDeviceTable();
            });
        }

        // 4. Tìm kiếm thiết bị theo tên
        const searchInput = document.getElementById('tableDeviceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.tableFilter.keyword = e.target.value.trim();
                this.renderDeviceTable();
            });
        }

        // 5. Nút Reset bộ lọc bảng
        const btnResetFilter = document.getElementById('btnResetTableFilter');
        if (btnResetFilter) {
            btnResetFilter.addEventListener('click', () => {
                this.tableFilter.room = 'all';
                this.tableFilter.keyword = '';
                if (roomSelect) roomSelect.value = 'all';
                if (searchInput) searchInput.value = '';
                this.renderDeviceTable();
            });
        }

        // 6. Lắng nghe thay đổi từ Dashboard qua localStorage StorageEvent (Đa tab song song)
        window.addEventListener('storage', (e) => {
            if (typeof EnergyDataStore !== 'undefined' && e.key === EnergyDataStore.STATE_KEY) {
                this.loadSharedData();
                this.renderOverviewMetrics(true);
                this.renderPeriodCards();
                this.updateDoughnutChartRealtime();
                this.updateDeviceTableRealtime();
                this.updateLineChartRealtime();
            }
        });

        // Lắng nghe sự kiện đồng bộ cục bộ (cùng tab hoặc qua custom event)
        window.addEventListener('ems_local_state_updated', (e) => {
            const state = (e.detail && e.detail.state) ? e.detail.state : e.detail;
            if (state && state.rooms) {
                this.loadSharedData();
                this.renderOverviewMetrics(true);
                this.renderPeriodCards();
                this.updateDoughnutChartRealtime();
                this.updateDeviceTableRealtime();
                this.updateLineChartRealtime();
            }
        });

        // 7. Nút đăng xuất
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                try {
                    localStorage.removeItem('ems_auth');
                    sessionStorage.removeItem('ems_auth');
                } catch (e) {}
                location.replace('login.html');
            });
        }
    },

    /**
     * Đồng hồ thời gian thực HH:mm:ss
     */
    startLiveClock() {
        const clockEl = document.getElementById('live-clock');
        const tick = () => {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            if (clockEl) clockEl.textContent = timeStr;
        };
        tick();
        setInterval(tick, 1000);
    },

    /**
     * Đèn xung công tơ điện tử nhấp nháy mô phỏng
     */
    startMeterPulse() {
        const led = document.getElementById('meter-impulse-led');
        if (!led) return;
        setInterval(() => {
            if (this.currentPowerWatts > 0) {
                led.classList.add('flash');
                setTimeout(() => led.classList.remove('flash'), 120);
            }
        }, 1500);
    }
};

// Khởi chạy khi tài liệu HTML đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    StatisticsApp.init();
});

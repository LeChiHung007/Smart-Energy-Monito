/**
 * DATA & CONFIGURATION MODULE
 * Chứa cấu trúc dữ liệu JSON khoa học, biểu giá bậc thang EVN quy chuẩn 6 bậc
 */

const INITIAL_DATA = {
    // Thông tin hộ gia đình
    household: {
        id: "EM-2026-VN88",
        customerName: "Gia đình Nguyễn Văn A",
        meterCode: "CT-EVN-89412",
        voltage: 220, // Volt
        ecoPoints: 420 // Điểm thưởng tiết kiệm năng lượng
    },

    // Biểu giá bán lẻ điện sinh hoạt 6 bậc theo quy định EVN hiện hành (VNĐ/kWh chưa VAT)
    evnTariffTiers: [
        { tier: 1, from: 0, to: 50, rate: 1893, name: "Bậc 1 (0 - 50 kWh)" },
        { tier: 2, from: 51, to: 100, rate: 1956, name: "Bậc 2 (51 - 100 kWh)" },
        { tier: 3, from: 101, to: 200, rate: 2271, name: "Bậc 3 (101 - 200 kWh)" },
        { tier: 4, from: 201, to: 300, rate: 2860, name: "Bậc 4 (201 - 300 kWh)" },
        { tier: 5, from: 301, to: 400, rate: 3197, name: "Bậc 5 (301 - 400 kWh)" },
        { tier: 6, from: 401, to: Infinity, rate: 3302, name: "Bậc 6 (Trên 400 kWh)" }
    ],
    vatRate: 0.08, // Thuế VAT 8% theo quy định mới

    // Sơ đồ các phòng và thiết bị điện trong nhà
    rooms: [
        {
            id: "living-room",
            name: "Phòng khách",
            icon: "fas fa-couch",
            area: "35 m²",
            gridArea: "living",
            devices: [
                {
                    id: "dev-lr-ac",
                    name: "Điều hòa Daikin Inverter",
                    type: "ac",
                    icon: "fas fa-snowflake",
                    powerNominal: 1200, // Watts định mức
                    powerCurrent: 1050,  // Watts thực tế
                    status: true,
                    isEco: true,
                    totalKwhMonth: 48.5
                },
                {
                    id: "dev-lr-tv",
                    name: "Smart TV OLED 65 inch",
                    type: "tv",
                    icon: "fas fa-tv",
                    powerNominal: 180,
                    powerCurrent: 145,
                    status: true,
                    isEco: false,
                    totalKwhMonth: 12.3
                },
                {
                    id: "dev-lr-light",
                    name: "Hệ thống đèn LED trần",
                    type: "light",
                    icon: "fas fa-lightbulb",
                    powerNominal: 60,
                    powerCurrent: 60,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 6.8
                },
                {
                    id: "dev-lr-fan",
                    name: "Quạt trần Panasonic",
                    type: "fan",
                    icon: "fas fa-fan",
                    powerNominal: 55,
                    powerCurrent: 0,
                    status: false,
                    isEco: true,
                    totalKwhMonth: 4.2
                }
            ]
        },
        {
            id: "kitchen",
            name: "Phòng bếp & Ăn",
            icon: "fas fa-utensils",
            area: "25 m²",
            gridArea: "kitchen",
            devices: [
                {
                    id: "dev-kt-fridge",
                    name: "Tủ lạnh Side-by-Side Inverter",
                    type: "fridge",
                    icon: "fas fa-cube",
                    powerNominal: 250,
                    powerCurrent: 180,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 38.0
                },
                {
                    id: "dev-kt-cooker",
                    name: "Bếp từ đôi Bosch",
                    type: "cooker",
                    icon: "fas fa-fire-burner",
                    powerNominal: 2200,
                    powerCurrent: 0,
                    status: false,
                    isEco: false,
                    totalKwhMonth: 22.4
                },
                {
                    id: "dev-kt-microwave",
                    name: "Lò vi sóng Sharp",
                    type: "appliance",
                    icon: "fas fa-bolt",
                    powerNominal: 900,
                    powerCurrent: 0,
                    status: false,
                    isEco: false,
                    totalKwhMonth: 5.1
                },
                {
                    id: "dev-kt-light",
                    name: "Đèn thanh ray thả bàn ăn",
                    type: "light",
                    icon: "fas fa-lightbulb",
                    powerNominal: 40,
                    powerCurrent: 40,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 3.5
                }
            ]
        },
        {
            id: "bedroom-master",
            name: "Phòng ngủ Master",
            icon: "fas fa-bed",
            area: "22 m²",
            gridArea: "master-bed",
            devices: [
                {
                    id: "dev-bm-ac",
                    name: "Điều hòa Panasonic 1.5 HP",
                    type: "ac",
                    icon: "fas fa-snowflake",
                    powerNominal: 1000,
                    powerCurrent: 820,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 42.0
                },
                {
                    id: "dev-bm-pc",
                    name: "Máy trạm PC & Màn hình đồ họa",
                    type: "computer",
                    icon: "fas fa-desktop",
                    powerNominal: 450,
                    powerCurrent: 310,
                    status: true,
                    isEco: false,
                    totalKwhMonth: 25.6
                },
                {
                    id: "dev-bm-light",
                    name: "Đèn ngủ & Đèn Downlight",
                    type: "light",
                    icon: "fas fa-lightbulb",
                    powerNominal: 30,
                    powerCurrent: 0,
                    status: false,
                    isEco: true,
                    totalKwhMonth: 2.1
                }
            ]
        },
        {
            id: "bathroom-laundry",
            name: "Phòng tắm & Giặt đồ",
            icon: "fas fa-bath",
            area: "14 m²",
            gridArea: "utility",
            devices: [
                {
                    id: "dev-bt-heater",
                    name: "Bình nước nóng Ariston 30L",
                    type: "heater",
                    icon: "fas fa-temperature-arrow-up",
                    powerNominal: 2500,
                    powerCurrent: 0,
                    status: false,
                    isEco: false,
                    totalKwhMonth: 18.2
                },
                {
                    id: "dev-bt-washer",
                    name: "Máy giặt sấy LG AI DD",
                    type: "washer",
                    icon: "fas fa-soap",
                    powerNominal: 1400,
                    powerCurrent: 950,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 14.8
                },
                {
                    id: "dev-bt-light",
                    name: "Đèn gương & Quạt hút mùi",
                    type: "light",
                    icon: "fas fa-lightbulb",
                    powerNominal: 45,
                    powerCurrent: 45,
                    status: true,
                    isEco: true,
                    totalKwhMonth: 2.9
                }
            ]
        }
    ]
};

/**
 * ==========================================================================
 * ENERGY DATA STORE - TRUNG TÂM ĐỒNG BỘ DỮ LIỆU THỜI GIAN THỰC (SHARED STATE)
 * Quản lý lưu trữ localStorage và đồng bộ liền mạch giữa Dashboard & Thống kê
 * ==========================================================================
 */
const EnergyDataStore = {
    STATE_KEY: 'ems_shared_state_v2',
    HISTORY_KEY: 'ems_realtime_history_v2',

    /**
     * Khởi tạo hoặc lấy trạng thái hệ thống hiện tại
     */
    loadState() {
        try {
            const raw = localStorage.getItem(this.STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Lỗi đọc localStorage state, khởi tạo lại từ INITIAL_DATA', e);
        }

        // Tạo bản sao mới từ INITIAL_DATA
        const defaultState = {
            household: JSON.parse(JSON.stringify(INITIAL_DATA.household)),
            rooms: JSON.parse(JSON.stringify(INITIAL_DATA.rooms)),
            evnTariffTiers: JSON.parse(JSON.stringify(INITIAL_DATA.evnTariffTiers)),
            vatRate: INITIAL_DATA.vatRate,
            speedMultiplier: 60,
            lastTick: Date.now()
        };
        this.saveState(defaultState);
        return defaultState;
    },

    /**
     * Lưu trạng thái xuống localStorage và phát sự kiện đồng bộ
     */
    saveState(state, sender = '') {
        try {
            state.lastTick = state.lastTick || Date.now();
            if (sender) state.tickSource = sender;
            localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
            window.dispatchEvent(new CustomEvent('ems_local_state_updated', {
                detail: { state, sender }
            }));
        } catch (e) {
            console.error('Không thể lưu state vào localStorage', e);
        }
    },

    /**
     * Đặt lại toàn bộ dữ liệu tiêu thụ về 0
     */
    resetState() {
        const state = this.loadState();
        state.rooms.forEach(room => {
            room.devices.forEach(device => {
                device.totalKwhMonth = 0;
            });
        });
        state.household.ecoPoints = INITIAL_DATA.household.ecoPoints;
        state.lastTick = Date.now();
        this.saveState(state);

        // Khởi tạo lại lịch sử
        this.resetHistory();
        return state;
    },

    /**
     * Tạo dữ liệu lịch sử mặc định cho 4 chu kỳ: Phút, Ngày, Tháng, Năm
     */
    createDefaultHistory(currentKwh = 246.40) {
        const now = new Date();
        const curHour = now.getHours();
        const curMin = now.getMinutes();

        // 1. Dữ liệu Theo phút: 12 phút gần nhất (kết thúc ở phút hiện tại)
        const minuteLabels = [];
        const minuteData = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 60000);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            minuteLabels.push(`${hh}:${mm}`);
            // Mức tiêu thụ mô phỏng mỗi phút (~0.03 - 0.05 kWh/phút khi bật tải)
            const baseVal = 0.032 + Math.sin(i) * 0.012;
            minuteData.push(Number(Math.max(0.015, baseVal).toFixed(3)));
        }

        // 2. Dữ liệu Theo ngày: 7 ngày gần nhất (kết thúc ở ngày hôm nay)
        const dayLabels = [];
        const dayData = [7.85, 8.12, 7.64, 8.45, 9.10, 10.45, 11.20];
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const dName = i === 0 ? 'Hôm nay' : dayNames[d.getDay()];
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            dayLabels.push(`${dName} (${dd}/${mm})`);
        }

        // 3. Dữ liệu Theo tháng: 12 tháng trong năm 2026
        const monthLabels = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        // Tháng 11 là tháng hiện tại, gắn trực tiếp với currentKwh
        const monthData = [
            215.4, 198.6, 230.1, 248.5, 290.8, 345.2,
            360.5, 335.8, 280.4, 255.0, Number(currentKwh.toFixed(2)), 0
        ];

        // 4. Dữ liệu Theo năm: 4 năm gần nhất
        const yearLabels = ['Năm 2023', 'Năm 2024', 'Năm 2025', 'Năm 2026'];
        // Tổng các tháng đã qua năm 2026 + tháng 11 hiện tại
        const pastMonthsSum = 215.4 + 198.6 + 230.1 + 248.5 + 290.8 + 345.2 + 360.5 + 335.8 + 280.4 + 255.0;
        const year2026Val = Number((pastMonthsSum + currentKwh).toFixed(2));
        const yearData = [2850.5, 2980.2, 3120.8, year2026Val];

        return {
            minute: {
                labels: minuteLabels,
                data: minuteData,
                unit: 'kWh',
                periodLabel: 'Điện năng tiêu thụ theo phút (kWh)'
            },
            day: {
                labels: dayLabels,
                data: dayData,
                unit: 'kWh',
                periodLabel: 'Điện năng tiêu thụ 7 ngày gần nhất (kWh)'
            },
            month: {
                labels: monthLabels,
                data: monthData,
                unit: 'kWh',
                periodLabel: 'Điện năng tiêu thụ 12 tháng trong năm (kWh)'
            },
            year: {
                labels: yearLabels,
                data: yearData,
                unit: 'kWh',
                periodLabel: 'Sản lượng điện tiêu thụ qua các năm (kWh)'
            }
        };
    },

    /**
     * Tải dữ liệu lịch sử từ localStorage
     */
    loadHistory(currentKwh = 246.40) {
        try {
            const raw = localStorage.getItem(this.HISTORY_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.minute && parsed.day && parsed.month && parsed.year) {
                    // Đồng bộ tháng 11 và năm 2026 với currentKwh thực tế
                    parsed.month.data[10] = Number(currentKwh.toFixed(2));
                    const pastMonthsSum = 215.4 + 198.6 + 230.1 + 248.5 + 290.8 + 345.2 + 360.5 + 335.8 + 280.4 + 255.0;
                    parsed.year.data[3] = Number((pastMonthsSum + currentKwh).toFixed(2));
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Lỗi đọc history từ localStorage', e);
        }

        const initialHist = this.createDefaultHistory(currentKwh);
        this.saveHistory(initialHist);
        return initialHist;
    },

    /**
     * Lưu dữ liệu lịch sử xuống localStorage
     */
    saveHistory(history) {
        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Không thể lưu history vào localStorage', e);
        }
    },

    /**
     * Đặt lại lịch sử về mặc định
     */
    resetHistory() {
        const hist = this.createDefaultHistory(0);
        this.saveHistory(hist);
        return hist;
    },

    /**
     * Cập nhật điểm dữ liệu thời gian thực khi có điện năng tiêu thụ mới (Tick)
     */
    recordLiveTick(addedKwh, totalKwhMonth, currentPowerW) {
        const history = this.loadHistory(totalKwhMonth);
        const now = new Date();
        const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 1. Cập nhật Theo Phút
        const minuteLabels = history.minute.labels;
        const minuteData = history.minute.data;
        const lastMinuteLabel = minuteLabels[minuteLabels.length - 1];

        if (lastMinuteLabel === curTimeStr) {
            // Cùng một phút: tích lũy thêm kWh vào phút này
            minuteData[minuteData.length - 1] = Number((minuteData[minuteData.length - 1] + addedKwh).toFixed(4));
        } else {
            // Sang phút mới: dịch chuyển buffer giữ 12 điểm
            minuteLabels.push(curTimeStr);
            minuteData.push(Number(addedKwh.toFixed(4)));
            if (minuteLabels.length > 12) {
                minuteLabels.shift();
                minuteData.shift();
            }
        }

        // 2. Cập nhật Theo Ngày (Ngày hôm nay)
        const dayData = history.day.data;
        dayData[dayData.length - 1] = Number((dayData[dayData.length - 1] + addedKwh).toFixed(3));

        // 3. Cập nhật Theo Tháng (Tháng 11)
        history.month.data[10] = Number(totalKwhMonth.toFixed(3));

        // 4. Cập nhật Theo Năm (Năm 2026)
        const pastMonthsSum = 215.4 + 198.6 + 230.1 + 248.5 + 290.8 + 345.2 + 360.5 + 335.8 + 280.4 + 255.0;
        history.year.data[3] = Number((pastMonthsSum + totalKwhMonth).toFixed(2));

        this.saveHistory(history);
        return history;
    }
};

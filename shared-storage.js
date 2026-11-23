/**
 * SHARED DATA & SYNCHRONIZATION MODULE (SHARED STORAGE)
 * Đồng bộ hóa dữ liệu trạng thái thiết bị, số liệu điện năng và lịch sử tiêu thụ
 * giữa Dashboard (index.html) và Trang Thống kê (statistics.html).
 *
 * Tái sử dụng nguồn dữ liệu INITIAL_DATA từ data.js và EnergyCalculator từ calculator.js.
 */

const SharedStorage = {
    KEYS: {
        STATE: 'ems_shared_state',              // Trạng thái thiết bị và cài đặt hiện tại
        HISTORY: 'ems_consumption_history',     // Lịch sử tiêu thụ theo thời gian (mẫu + bucket)
        HEARTBEAT: 'ems_sim_heartbeat'          // Đánh dấu tab nào đang chạy mô phỏng
    },

    // Giới hạn số lượng mẫu lưu trữ trong localStorage để tránh tràn bộ nhớ
    LIMITS: {
        MAX_RAW_SAMPLES: 180,  // Tối đa 180 mẫu chi tiết (tương đương 3 phút ở 1s)
        MAX_MINUTES: 120,      // Tối đa 120 phút (2 giờ)
        MAX_HOURS: 48,         // Tối đa 48 giờ
        MAX_DAYS: 30,          // Tối đa 30 ngày
        MAX_MONTHS: 12         // Tối đa 12 tháng
    },

    /**
     * Tải trạng thái dùng chung từ localStorage.
     * Nếu chưa có, khởi tạo từ INITIAL_DATA của data.js.
     */
    loadState() {
        try {
            const raw = localStorage.getItem(this.KEYS.STATE);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('[SharedStorage] Không thể đọc localStorage, dùng dữ liệu mặc định:', e);
        }

        // Khởi tạo trạng thái ban đầu nếu chưa có trong localStorage
        if (typeof INITIAL_DATA !== 'undefined') {
            const defaultState = {
                household: JSON.parse(JSON.stringify(INITIAL_DATA.household)),
                rooms: JSON.parse(JSON.stringify(INITIAL_DATA.rooms)),
                evnTariffTiers: JSON.parse(JSON.stringify(INITIAL_DATA.evnTariffTiers)),
                vatRate: INITIAL_DATA.vatRate,
                speedMultiplier: 60,
                simulation: {
                    isRunning: true
                },
                lastUpdated: Date.now()
            };
            this.saveState(defaultState);
            return defaultState;
        }

        return null;
    },

    /**
     * Lưu trạng thái dùng chung vào localStorage.
     * Phát sự kiện để các tab khác cập nhật tức thì.
     */
    saveState(state) {
        if (!state || !state.rooms) return;
        try {
            const payload = {
                household: state.household,
                rooms: state.rooms,
                evnTariffTiers: state.evnTariffTiers || (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.evnTariffTiers : []),
                vatRate: state.vatRate || 0.08,
                speedMultiplier: state.speedMultiplier || 60,
                isRunning: state.simulation ? state.simulation.isRunning : true,
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.KEYS.STATE, JSON.stringify(payload));
        } catch (e) {
            console.warn('[SharedStorage] Lỗi khi lưu state vào localStorage:', e);
        }
    },

    /**
     * Tải dữ liệu lịch sử tiêu thụ.
     */
    loadHistory() {
        try {
            const raw = localStorage.getItem(this.KEYS.HISTORY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.buckets) return parsed;
            }
        } catch (e) {
            console.warn('[SharedStorage] Lỗi khi đọc history:', e);
        }

        // Cấu trúc lịch sử mặc định
        return {
            startedAt: Date.now(),
            lastRecordedAt: Date.now(),
            samplesCount: 0,
            rawSamples: [], // [{ t, kwh, cost, watts }]
            buckets: {
                minutes: [], // [{ id, label, deltaKwh, deltaCost, endKwh, endCost, watts }]
                hours: [],   // [{ id, label, deltaKwh, deltaCost, endKwh, endCost }]
                days: [],    // [{ id, label, deltaKwh, deltaCost, endKwh, endCost }]
                months: []   // [{ id, label, totalKwh, totalCost }]
            }
        };
    },

    /**
     * Lưu cấu trúc lịch sử tiêu thụ vào localStorage.
     */
    saveHistory(history) {
        try {
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        } catch (e) {
            console.warn('[SharedStorage] Lỗi khi lưu history:', e);
        }
    },

    /**
     * Ghi nhận một mẫu dữ liệu tiêu thụ vào lịch sử.
     * Tự động tổng hợp vào các bucket: phút, giờ, ngày, tháng.
     */
    recordSample(state) {
        if (!state || !state.rooms || typeof EnergyCalculator === 'undefined') return;

        const totalKwh = EnergyCalculator.calculateTotalKwh(state.rooms);
        const currentPowerWatts = EnergyCalculator.calculateCurrentPower(state.rooms);
        const tiers = state.evnTariffTiers || (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.evnTariffTiers : []);
        const vatRate = state.vatRate || 0.08;
        const billObj = EnergyCalculator.calculateTieredBill(totalKwh, tiers, vatRate);
        const totalCost = billObj.totalWithVat;

        const now = new Date();
        const timestamp = now.getTime();

        const history = this.loadHistory();
        history.lastRecordedAt = timestamp;
        history.samplesCount += 1;

        // 1. Ghi nhận mẫu thô (Raw Sample)
        history.rawSamples.push({
            t: timestamp,
            kwh: Number(totalKwh.toFixed(3)),
            cost: totalCost,
            watts: currentPowerWatts
        });
        if (history.rawSamples.length > this.LIMITS.MAX_RAW_SAMPLES) {
            history.rawSamples.shift();
        }

        // Format định danh thời gian
        const pad = (n) => String(n).padStart(2, '0');
        const minuteId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const minuteLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const hourId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:00`;
        const hourLabel = `${pad(now.getHours())}:00`;

        const dayId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const dayLabel = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;

        const monthId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const monthLabel = `Tháng ${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

        // 2. Cập nhật Bucket Phút
        let curMin = history.buckets.minutes.find(m => m.id === minuteId);
        if (!curMin) {
            // Khởi tạo phút mới
            const prevMin = history.buckets.minutes[history.buckets.minutes.length - 1];
            const startKwh = prevMin ? prevMin.endKwh : totalKwh;
            const startCost = prevMin ? prevMin.endCost : totalCost;

            curMin = {
                id: minuteId,
                label: minuteLabel,
                startKwh: startKwh,
                endKwh: totalKwh,
                deltaKwh: Math.max(0, Number((totalKwh - startKwh).toFixed(4))),
                startCost: startCost,
                endCost: totalCost,
                deltaCost: Math.max(0, totalCost - startCost),
                watts: currentPowerWatts
            };
            history.buckets.minutes.push(curMin);
            if (history.buckets.minutes.length > this.LIMITS.MAX_MINUTES) {
                history.buckets.minutes.shift();
            }
        } else {
            curMin.endKwh = totalKwh;
            curMin.deltaKwh = Math.max(0, Number((totalKwh - curMin.startKwh).toFixed(4)));
            curMin.endCost = totalCost;
            curMin.deltaCost = Math.max(0, totalCost - curMin.startCost);
            curMin.watts = currentPowerWatts;
        }

        // 3. Cập nhật Bucket Giờ
        let curHour = history.buckets.hours.find(h => h.id === hourId);
        if (!curHour) {
            const prevHour = history.buckets.hours[history.buckets.hours.length - 1];
            const startKwh = prevHour ? prevHour.endKwh : totalKwh;
            const startCost = prevHour ? prevHour.endCost : totalCost;

            curHour = {
                id: hourId,
                label: hourLabel,
                startKwh: startKwh,
                endKwh: totalKwh,
                deltaKwh: Math.max(0, Number((totalKwh - startKwh).toFixed(3))),
                startCost: startCost,
                endCost: totalCost,
                deltaCost: Math.max(0, totalCost - startCost)
            };
            history.buckets.hours.push(curHour);
            if (history.buckets.hours.length > this.LIMITS.MAX_HOURS) {
                history.buckets.hours.shift();
            }
        } else {
            curHour.endKwh = totalKwh;
            curHour.deltaKwh = Math.max(0, Number((totalKwh - curHour.startKwh).toFixed(3)));
            curHour.endCost = totalCost;
            curHour.deltaCost = Math.max(0, totalCost - curHour.startCost);
        }

        // 4. Cập nhật Bucket Ngày
        let curDay = history.buckets.days.find(d => d.id === dayId);
        if (!curDay) {
            const prevDay = history.buckets.days[history.buckets.days.length - 1];
            const startKwh = prevDay ? prevDay.endKwh : totalKwh;
            const startCost = prevDay ? prevDay.endCost : totalCost;

            curDay = {
                id: dayId,
                label: dayLabel,
                startKwh: startKwh,
                endKwh: totalKwh,
                deltaKwh: Math.max(0, Number((totalKwh - startKwh).toFixed(3))),
                startCost: startCost,
                endCost: totalCost,
                deltaCost: Math.max(0, totalCost - startCost)
            };
            history.buckets.days.push(curDay);
            if (history.buckets.days.length > this.LIMITS.MAX_DAYS) {
                history.buckets.days.shift();
            }
        } else {
            curDay.endKwh = totalKwh;
            curDay.deltaKwh = Math.max(0, Number((totalKwh - curDay.startKwh).toFixed(3)));
            curDay.endCost = totalCost;
            curDay.deltaCost = Math.max(0, totalCost - curDay.startCost);
        }

        // 5. Cập nhật Bucket Tháng (Lũy kế chu kỳ tháng hiện tại)
        let curMonth = history.buckets.months.find(m => m.id === monthId);
        if (!curMonth) {
            curMonth = {
                id: monthId,
                label: monthLabel,
                totalKwh: Number(totalKwh.toFixed(3)),
                totalCost: totalCost
            };
            history.buckets.months.push(curMonth);
            if (history.buckets.months.length > this.LIMITS.MAX_MONTHS) {
                history.buckets.months.shift();
            }
        } else {
            curMonth.totalKwh = Number(totalKwh.toFixed(3));
            curMonth.totalCost = totalCost;
        }

        this.saveHistory(history);
    },

    /**
     * Đặt lại toàn bộ lịch sử khi người dùng bấm "Reset tiền điện" trên Dashboard
     */
    resetHistory(state) {
        const freshHistory = {
            startedAt: Date.now(),
            lastRecordedAt: Date.now(),
            samplesCount: 0,
            rawSamples: [],
            buckets: {
                minutes: [],
                hours: [],
                days: [],
                months: []
            }
        };
        this.saveHistory(freshHistory);
        if (state) {
            this.recordSample(state);
        }
    },

    /**
     * Quản lý Heartbeat giữa các tab.
     * Giúp xác định tab nào đang là master chạy mô phỏng, tránh chạy trùng lặp.
     */
    updateHeartbeat(tabId) {
        try {
            localStorage.setItem(this.KEYS.HEARTBEAT, JSON.stringify({
                tabId: tabId,
                timestamp: Date.now()
            }));
        } catch (e) {}
    },

    /**
     * Kiểm tra xem có tab khác đang chạy mô phỏng không (heartbeat < 2500ms).
     */
    isOtherTabActive(currentTabId) {
        try {
            const raw = localStorage.getItem(this.KEYS.HEARTBEAT);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data && data.tabId !== currentTabId && (Date.now() - data.timestamp < 2500)) {
                return true;
            }
        } catch (e) {}
        return false;
    }
};

/**
 * CALCULATOR MODULE - QUẢN LÝ TÍNH TOÁN ĐIỆN NĂNG & TIỀN ĐIỆN BẬC THANG EVN
 * Tối ưu hóa với map, filter, reduce. Đảm bảo tính toán chính xác tuyệt đối.
 */

const EnergyCalculator = {
    /**
     * Tính tổng công suất tức thời (W) của toàn bộ thiết bị đang bật
     */
    calculateCurrentPower(rooms) {
        return rooms
            .flatMap(room => room.devices)
            .filter(device => device.status)
            .reduce((totalW, device) => totalW + device.powerCurrent, 0);
    },

    /**
     * Tính tổng điện năng tiêu thụ trong tháng (kWh) tích lũy
     */
    calculateTotalKwh(rooms) {
        return rooms
            .flatMap(room => room.devices)
            .reduce((sumKwh, device) => sumKwh + device.totalKwhMonth, 0);
    },

    /**
     * Đếm số lượng thiết bị đang bật / tổng số thiết bị
     */
    getDeviceCounts(rooms) {
        const allDevices = rooms.flatMap(room => room.devices);
        const activeCount = allDevices.filter(dev => dev.status).length;
        const totalCount = allDevices.length;
        return { activeCount, totalCount };
    },

    /**
     * Dự phóng điện năng tiêu thụ cả tháng (kWh)
     * Dựa trên số ngày đã trôi qua trong tháng (mặc định mốc tính toán là ngày 20)
     */
    estimateMonthlyKwh(currentKwh, currentDay = 20, daysInMonth = 30) {
        if (currentDay <= 0) return currentKwh;
        const dailyAverage = currentKwh / currentDay;
        return Number((dailyAverage * daysInMonth).toFixed(2));
    },

    /**
     * TÍNH TIỀN ĐIỆN THEO BIỂU GIÁ BẬC THANG 6 BẬC CỦA EVN
     * @param {number} kwh - Tổng số kWh tiêu thụ
     * @param {Array} tiers - Danh sách cấu hình bậc thang EVN
     * @param {number} vatRate - Tỷ lệ thuế VAT (ví dụ 0.08 = 8%)
     */
    calculateTieredBill(kwh, tiers, vatRate = 0.08) {
        let remainingKwh = Math.max(0, kwh);
        let subtotal = 0;

        // Sử dụng map để duyệt qua từng bậc và tính toán chi tiết
        const breakdown = tiers.map((tierConfig) => {
            if (remainingKwh <= 0) {
                return {
                    ...tierConfig,
                    consumed: 0,
                    cost: 0,
                    active: false
                };
            }

            const tierCapacity = tierConfig.to === Infinity 
                ? Infinity 
                : (tierConfig.to - tierConfig.from + 1);

            const consumedInTier = Math.min(remainingKwh, tierCapacity);
            const costInTier = Math.round(consumedInTier * tierConfig.rate);

            remainingKwh -= consumedInTier;
            subtotal += costInTier;

            return {
                ...tierConfig,
                consumed: Number(consumedInTier.toFixed(2)),
                cost: costInTier,
                active: consumedInTier > 0
            };
        });

        const vatAmount = Math.round(subtotal * vatRate);
        const totalWithVat = subtotal + vatAmount;

        return {
            kwh: Number(kwh.toFixed(2)),
            subtotal,
            vatRate,
            vatAmount,
            totalWithVat,
            breakdown
        };
    },

    /**
     * Phân loại mức tiêu thụ năng lượng
     */
    getConsumptionLevel(kwh) {
        if (kwh <= 100) return { label: "Rất tiết kiệm", level: "eco", color: "#10b981", badge: "badge-success" };
        if (kwh <= 200) return { label: "Hợp lý", level: "normal", color: "#38bdf8", badge: "badge-primary" };
        if (kwh <= 300) return { label: "Tiêu thụ cao", level: "warning", color: "#f59e0b", badge: "badge-warning" };
        return { label: "Cảnh báo lãng phí", level: "danger", color: "#ef4444", badge: "badge-danger" };
    },

    /**
     * Tính điểm thưởng tiết kiệm điện (Eco Points)
     */
    calculateEcoPointsReward(rooms) {
        const activeDevices = rooms.flatMap(r => r.devices).filter(d => d.status);
        const ecoDevicesCount = activeDevices.filter(d => d.isEco).length;
        return ecoDevicesCount * 5;
    }
};

/**
 * APPLICATION CORE CONTROLLER (REALTIME TICKER & SOUND & RESET ENGINE)
 * Xử lý DOM, State Management, Realtime Simulation từng giây (1000ms),
 * Counter nhảy số thời gian thực, Hiệu ứng âm thanh Web Audio & Chức năng Reset.
 */

// Khởi tạo State từ EnergyDataStore để đồng bộ đa màn hình
const storedInitial = (typeof EnergyDataStore !== 'undefined') ? EnergyDataStore.loadState() : null;

// State của ứng dụng
const AppState = {
    household: storedInitial ? storedInitial.household : { ...INITIAL_DATA.household },
    rooms: storedInitial ? storedInitial.rooms : JSON.parse(JSON.stringify(INITIAL_DATA.rooms)),
    evnTariffTiers: storedInitial ? storedInitial.evnTariffTiers : [...INITIAL_DATA.evnTariffTiers],
    vatRate: storedInitial ? storedInitial.vatRate : INITIAL_DATA.vatRate,
    
    // Bộ lọc hiển thị thiết bị ('all' | 'active' | 'eco')
    currentFilter: 'all',
    
    // Tốc độ mô phỏng (1x thực tế, 60x mặc định để demo nhảy số rõ rệt)
    speedMultiplier: storedInitial ? (storedInitial.speedMultiplier || 60) : 60,
    
    // Trạng thái mô phỏng thời gian thực
    simulation: {
        isRunning: true,
        intervalId: null,
        intervalMs: 1000 // 1 giây mỗi chu kỳ cập nhật
    }
};

/**
 * MODULE HIỆU ỨNG ÂM THANH WEB AUDIO API (SYNTHETIC HAPTIC SOUNDS)
 * Tạo âm thanh click/pop nhẹ nhàng, chuyên nghiệp mà không cần tải file ngoài
 */
const SoundFX = {
    audioCtx: null,

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    // Âm thanh bật công tắc (High Pitch Pop)
    playToggleOn() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) {
            // Ignore if audio is blocked by browser policy
        }
    },

    // Âm thanh tắt công tắc (Low Pitch Click)
    playToggleOff() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) {
            // Ignore
        }
    },

    // Âm thanh Reset / Hoàn tất
    playResetSound() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) {
            // Ignore
        }
    }
};

/**
 * Format số tiền sang định dạng tiền tệ Việt Nam (VNĐ)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * MODULE RENDER GIAO DIỆN
 */
const AppRenderer = {
    /**
     * Render các thẻ chỉ số tóm tắt (Top KPI Metrics) kèm hiệu ứng nhảy số thời gian thực
     */
    renderMetrics(animate = false) {
        const currentPowerWatts = EnergyCalculator.calculateCurrentPower(AppState.rooms);
        const currentPowerKw = (currentPowerWatts / 1000).toFixed(2);
        const totalKwhMonth = EnergyCalculator.calculateTotalKwh(AppState.rooms);
        const { activeCount, totalCount } = EnergyCalculator.getDeviceCounts(AppState.rooms);
        
        // Tiền điện thực tế đã tiêu thụ đến thời điểm hiện tại
        const actualBillCalculation = EnergyCalculator.calculateTieredBill(totalKwhMonth, AppState.evnTariffTiers, AppState.vatRate);

        // Dự phóng tiền điện cả tháng (giả định mốc ngày 20)
        const projectedKwh = EnergyCalculator.estimateMonthlyKwh(totalKwhMonth, 20, 30);
        const projectedBillCalculation = EnergyCalculator.calculateTieredBill(projectedKwh, AppState.evnTariffTiers, AppState.vatRate);
        const consumptionStatus = EnergyCalculator.getConsumptionLevel(projectedKwh);

        // DOM elements
        const elCurrentPower = document.getElementById('metric-current-power');
        const elActiveDevices = document.getElementById('metric-active-devices');
        const elTotalKwh = document.getElementById('metric-total-kwh');
        const elCurrentBill = document.getElementById('metric-current-bill');
        const elEstMonthBill = document.getElementById('metric-est-month-bill');
        const elEcoPoints = document.getElementById('topbar-eco-points');

        if (elCurrentPower) {
            elCurrentPower.textContent = currentPowerKw;
        }
        if (elActiveDevices) elActiveDevices.textContent = `${activeCount}/${totalCount}`;
        
        // Hiển thị kWh 3 chữ số thập phân để thấy rõ từng mili-kWh nhảy liên tục
        if (elTotalKwh) {
            elTotalKwh.textContent = totalKwhMonth.toFixed(3);
            if (animate && currentPowerWatts > 0) {
                elTotalKwh.classList.add('value-update');
                setTimeout(() => elTotalKwh.classList.remove('value-update'), 350);
            }
        }

        // Tiền điện thực tế nhảy từng đồng thời gian thực
        if (elCurrentBill) {
            elCurrentBill.textContent = formatCurrency(actualBillCalculation.totalWithVat);
            if (animate && currentPowerWatts > 0) {
                elCurrentBill.classList.add('value-update');
                setTimeout(() => elCurrentBill.classList.remove('value-update'), 350);
            }
        }

        if (elEstMonthBill) {
            elEstMonthBill.textContent = formatCurrency(projectedBillCalculation.totalWithVat);
        }

        if (elEcoPoints) {
            elEcoPoints.textContent = `${AppState.household.ecoPoints} Điểm`;
        }

        // Tìm thiết bị tiêu thụ nhiều nhất để chạy song song với tiền điện
        const allDevices = [];
        AppState.rooms.forEach(room => {
            room.devices.forEach(d => {
                allDevices.push({
                    ...d,
                    roomName: room.name
                });
            });
        });
        const topDevice = allDevices.length > 0
            ? [...allDevices].sort((a, b) => (b.totalKwhMonth || 0) - (a.totalKwhMonth || 0))[0]
            : null;
        const topPercent = (totalKwhMonth > 0 && topDevice)
            ? ((topDevice.totalKwhMonth / totalKwhMonth) * 100).toFixed(1)
            : '0.0';

        // Cập nhật Banner Thiết bị tiêu thụ nhiều nhất chạy song song
        const elPlbName = document.getElementById('plb-device-name');
        const elPlbDetails = document.getElementById('plb-device-details');
        const elTopDevShort = document.getElementById('metric-top-dev-short');

        if (topDevice) {
            if (elPlbName) elPlbName.textContent = topDevice.name;
            if (elPlbDetails) {
                elPlbDetails.textContent = `${topDevice.totalKwhMonth.toFixed(2)} kWh (${topPercent}%) • ${topDevice.roomName}`;
            }
            if (elTopDevShort) {
                elTopDevShort.textContent = topDevice.name;
            }
        }

        // Render phân tích tiền điện bậc thang ở Sidebar
        this.renderTariffSidebar(totalKwhMonth, projectedKwh, actualBillCalculation, projectedBillCalculation, consumptionStatus);
    },

    /**
     * Trigger animation class nhẹ nhàng trên một DOM element
     */
    triggerAnimation(element, className) {
        if (!element) return;
        element.classList.remove(className);
        void element.offsetWidth; // Force DOM Reflow
        element.classList.add(className);
    },

    /**
     * Hiển thị Toast thông báo nổi trên góc màn hình
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('app-toast');
        const toastMsg = document.getElementById('toast-message');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.className = `toast-notification toast-${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    },

    /**
     * Render sơ đồ các phòng và thiết bị (CSS Grid Layout)
     */
    renderFloorplan() {
        const container = document.getElementById('floorplan-container');
        if (!container) return;

        const roomsHtml = AppState.rooms.map(room => {
            const filteredDevices = room.devices.filter(device => {
                if (AppState.currentFilter === 'active') return device.status;
                if (AppState.currentFilter === 'eco') return device.isEco;
                return true;
            });

            const roomPowerWatts = room.devices
                .filter(d => d.status)
                .reduce((sum, d) => sum + d.powerCurrent, 0);

            const devicesHtml = filteredDevices.length > 0 ? filteredDevices.map(device => `
                <div class="device-item ${device.status ? 'active' : ''}" data-device-id="${device.id}">
                    <div class="device-info">
                        <div class="device-type-icon">
                            <i class="${device.icon}"></i>
                        </div>
                        <div class="device-text-block">
                            <div class="device-title">
                                <span>${device.name}</span>
                                ${device.isEco ? '<span class="eco-tag"><i class="fas fa-leaf"></i> Inverter</span>' : ''}
                            </div>
                            <div class="device-sub">
                                Định mức: ${device.powerNominal}W • Tháng: ${device.totalKwhMonth.toFixed(2)} kWh
                            </div>
                        </div>
                    </div>

                    <div class="device-controls">
                        <div class="device-power-display">
                            <span class="power-val">${device.status ? device.powerCurrent : 0}</span>
                            <span class="power-unit">W</span>
                        </div>
                        <label class="switch" title="Bật/Tắt ${device.name}">
                            <input type="checkbox" 
                                   class="device-toggle" 
                                   data-device-id="${device.id}" 
                                   ${device.status ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `).join('') : `
                <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
                    Không có thiết bị phù hợp bộ lọc
                </div>
            `;

            return `
                <div class="room-card" data-room-id="${room.id}">
                    <div class="room-header">
                        <div class="room-title-wrap">
                            <div class="room-icon-box">
                                <i class="${room.icon}"></i>
                            </div>
                            <div>
                                <h3 class="room-name">${room.name}</h3>
                                <div class="room-meta">${room.area} • ${room.devices.length} thiết bị</div>
                            </div>
                        </div>
                        <div class="room-power-badge">
                            <i class="fas fa-bolt"></i> ${(roomPowerWatts / 1000).toFixed(2)} kW
                        </div>
                    </div>

                    <div class="devices-list">
                        ${devicesHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = roomsHtml;
    },

    /**
     * Cập nhật nhanh số liệu công suất trên từng item mà không cần đập DOM đi xây lại
     * Giúp animation của cánh quạt/tuyết/đèn không bị khựng lại mỗi giây!
     */
    updateDevicePowersOnly() {
        AppState.rooms.forEach(room => {
            room.devices.forEach(device => {
                const itemEl = document.querySelector(`.device-item[data-device-id="${device.id}"]`);
                if (itemEl) {
                    const powerValEl = itemEl.querySelector('.power-val');
                    const subTextEl = itemEl.querySelector('.device-sub');
                    if (powerValEl) {
                        powerValEl.textContent = device.status ? device.powerCurrent : 0;
                    }
                    if (subTextEl) {
                        subTextEl.textContent = `Định mức: ${device.powerNominal}W • Tháng: ${device.totalKwhMonth.toFixed(2)} kWh`;
                    }
                }
            });

            // Cập nhật công suất tổng của phòng
            const roomEl = document.querySelector(`.room-card[data-room-id="${room.id}"]`);
            if (roomEl) {
                const badgeEl = roomEl.querySelector('.room-power-badge');
                const totalWatts = room.devices.filter(d => d.status).reduce((s, d) => s + d.powerCurrent, 0);
                if (badgeEl) {
                    badgeEl.innerHTML = `<i class="fas fa-bolt"></i> ${(totalWatts / 1000).toFixed(2)} kW`;
                }
            }
        });
    },

    /**
     * Render bảng tính chi tiết 6 bậc thang điện EVN
     */
    renderTariffSidebar(currentKwh, projectedKwh, actualBill, projectedBill, consumptionStatus) {
        const elSubtotal = document.getElementById('bill-subtotal');
        const elVat = document.getElementById('bill-vat');
        const elTotal = document.getElementById('bill-total');
        const elKwhCurrent = document.getElementById('bill-current-kwh');
        const elKwhProjected = document.getElementById('bill-projected-kwh');
        const elConsumptionBadge = document.getElementById('bill-status-badge');

        if (elSubtotal) elSubtotal.textContent = formatCurrency(actualBill.subtotal);
        if (elVat) elVat.textContent = formatCurrency(actualBill.vatAmount);
        if (elTotal) elTotal.textContent = formatCurrency(actualBill.totalWithVat);
        if (elKwhCurrent) elKwhCurrent.textContent = `${currentKwh.toFixed(3)} kWh`;
        if (elKwhProjected) elKwhProjected.textContent = `${projectedKwh.toFixed(1)} kWh`;
        if (elConsumptionBadge) {
            elConsumptionBadge.textContent = consumptionStatus.label;
            elConsumptionBadge.style.color = consumptionStatus.color;
        }

        const tiersListContainer = document.getElementById('tariff-tiers-list');
        if (!tiersListContainer) return;

        const tiersHtml = actualBill.breakdown.map(tier => {
            const maxCapacity = tier.to === Infinity ? 100 : (tier.to - tier.from + 1);
            const percentage = tier.to === Infinity 
                ? (tier.consumed > 0 ? 100 : 0)
                : Math.min(100, Math.round((tier.consumed / maxCapacity) * 100));

            return `
                <div class="tier-item ${tier.active ? 'active' : ''}">
                    <div class="tier-header">
                        <span class="tier-name">${tier.name}</span>
                        <span class="tier-rate">${tier.rate.toLocaleString('vi-VN')} đ/kWh</span>
                    </div>
                    <div class="tier-progress-bg">
                        <div class="tier-progress-fill" style="width: ${percentage}%;"></div>
                    </div>
                    <div class="tier-footer">
                        <span>Đã dùng: <strong>${tier.consumed.toFixed(2)} kWh</strong></span>
                        <span class="tier-cost">${formatCurrency(tier.cost)}</span>
                    </div>
                </div>
            `;
        }).join('');

        tiersListContainer.innerHTML = tiersHtml;
    }
};

/**
 * MODULE EVENT LISTENERS & USER INTERACTIONS
 */
const AppController = {
    init() {
        AppRenderer.renderFloorplan();
        AppRenderer.renderMetrics(false);

        this.bindEvents();
        this.startRealtimeSimulation();
        this.startClock();
    },

    /**
     * Đồng hồ thời gian thực HH:mm:ss
     */
    startClock() {
        const clockEl = document.getElementById('live-clock');
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            if (clockEl) clockEl.textContent = timeStr;
        };
        updateTime();
        setInterval(updateTime, 1000);
    },

    bindEvents() {
        const floorplanContainer = document.getElementById('floorplan-container');

        // Event Delegation cho Toggle Bật/Tắt thiết bị
        if (floorplanContainer) {
            floorplanContainer.addEventListener('change', (e) => {
                if (e.target && e.target.classList.contains('device-toggle')) {
                    const deviceId = e.target.getAttribute('data-device-id');
                    const isChecked = e.target.checked;
                    this.toggleDevice(deviceId, isChecked);
                }
            });
        }

        // Bộ lọc thiết bị
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.currentFilter = btn.getAttribute('data-filter');
                AppRenderer.renderFloorplan();
            });
        });

        // Nút Bật tất cả
        const btnTurnAllOn = document.getElementById('btn-turn-all-on');
        if (btnTurnAllOn) {
            btnTurnAllOn.addEventListener('click', () => {
                SoundFX.playToggleOn();
                this.setAllDevices(true);
                AppRenderer.showToast('Đã bật toàn bộ thiết bị trong nhà!', 'success');
            });
        }

        // Nút Tắt tất cả
        const btnTurnAllOff = document.getElementById('btn-turn-all-off');
        if (btnTurnAllOff) {
            btnTurnAllOff.addEventListener('click', () => {
                SoundFX.playToggleOff();
                this.setAllDevices(false);
                AppRenderer.showToast('Đã tắt toàn bộ thiết bị!', 'info');
            });
        }

        // Nút Kích hoạt chế độ Tiết kiệm điện (Eco Mode)
        const btnEcoMode = document.getElementById('btn-eco-mode');
        if (btnEcoMode) {
            btnEcoMode.addEventListener('click', () => {
                SoundFX.playToggleOn();
                this.activateEcoMode();
            });
        }

        // NÚT RESET TIỀN ĐIỆN VÀ CHU KỲ THEO YÊU CẦU NGƯỜI DÙNG
        const btnResetBill = document.getElementById('btn-reset-bill');
        if (btnResetBill) {
            btnResetBill.addEventListener('click', () => {
                this.resetElectricityBill();
            });
        }

        // Bộ chọn tốc độ mô phỏng
        const speedSelect = document.getElementById('sim-speed-select');
        if (speedSelect) {
            if (AppState.speedMultiplier) {
                speedSelect.value = String(AppState.speedMultiplier);
            }
            speedSelect.addEventListener('change', (e) => {
                AppState.speedMultiplier = parseInt(e.target.value, 10) || 1;
                if (typeof EnergyDataStore !== 'undefined') {
                    EnergyDataStore.saveState(AppState);
                }
                AppRenderer.showToast(`Đã chuyển sang tốc độ: ${AppState.speedMultiplier}x`, 'info');
            });
        }

        // Nút tạm dừng / tiếp tục mô phỏng thời gian thực
        const btnToggleSim = document.getElementById('btn-toggle-simulation');
        if (btnToggleSim) {
            btnToggleSim.addEventListener('click', () => this.toggleSimulation());
        }

        // Lắng nghe đồng bộ song song từ tab Thống kê (Đa tab)
        window.addEventListener('storage', (e) => {
            if (typeof EnergyDataStore !== 'undefined' && e.key === EnergyDataStore.STATE_KEY) {
                const synced = EnergyDataStore.loadState();
                if (synced && synced.rooms) {
                    AppState.rooms = synced.rooms;
                    AppState.household = synced.household;
                    AppRenderer.updateDevicePowersOnly();
                    AppRenderer.renderMetrics(true);
                }
            }
        });

        // Lắng nghe đồng bộ cục bộ (cùng tab hoặc qua custom event)
        window.addEventListener('ems_local_state_updated', (e) => {
            const synced = (e.detail && e.detail.state) ? e.detail.state : e.detail;
            if (synced && synced !== AppState && synced.rooms) {
                AppState.rooms = synced.rooms;
                AppState.household = synced.household;
                AppRenderer.updateDevicePowersOnly();
                AppRenderer.renderMetrics(true);
            }
        });
    },

    /**
     * Bật/Tắt một thiết bị cụ thể kèm animation & âm thanh
     */
    toggleDevice(deviceId, newStatus) {
        if (newStatus) {
            SoundFX.playToggleOn();
        } else {
            SoundFX.playToggleOff();
        }

        AppState.rooms.forEach(room => {
            const device = room.devices.find(d => d.id === deviceId);
            if (device) {
                device.status = newStatus;
                if (newStatus) {
                    device.powerCurrent = Math.round(device.powerNominal * (0.8 + Math.random() * 0.25));
                } else {
                    device.powerCurrent = 0;
                }
            }
        });

        // Hiệu ứng nảy điểm thưởng nếu bật thiết bị tiết kiệm
        if (newStatus) {
            const bonus = EnergyCalculator.calculateEcoPointsReward(AppState.rooms);
            if (bonus > 0) {
                AppState.household.ecoPoints += 2;
                const pill = document.querySelector('.eco-reward-pill');
                if (pill) AppRenderer.triggerAnimation(pill, 'bounce');
            }
        }

        if (typeof EnergyDataStore !== 'undefined') {
            EnergyDataStore.saveState(AppState);
        }

        AppRenderer.renderFloorplan();
        AppRenderer.renderMetrics(true);
    },

    /**
     * CHỨC NĂNG RESET LẠI TIỀN ĐIỆN & CHU KỲ SỬ DỤNG
     */
    resetElectricityBill() {
        SoundFX.playResetSound();

        if (typeof EnergyDataStore !== 'undefined') {
            const resetResult = EnergyDataStore.resetState();
            AppState.rooms = resetResult.rooms;
            AppState.household = resetResult.household;
        } else {
            // Đặt lại số kWh của toàn bộ thiết bị về 0
            AppState.rooms.forEach(room => {
                room.devices.forEach(device => {
                    device.totalKwhMonth = 0;
                });
            });
        }

        // Cập nhật giao diện
        AppRenderer.renderFloorplan();
        AppRenderer.renderMetrics(true);

        // Hiển thị thông báo
        AppRenderer.showToast('Đã đặt lại tiền điện và số kWh chu kỳ về 0!', 'danger');
    },

    /**
     * Bật hoặc tắt hàng loạt thiết bị
     */
    setAllDevices(status) {
        AppState.rooms.forEach(room => {
            room.devices.forEach(device => {
                device.status = status;
                device.powerCurrent = status ? Math.round(device.powerNominal * 0.85) : 0;
            });
        });

        if (typeof EnergyDataStore !== 'undefined') {
            EnergyDataStore.saveState(AppState);
        }

        AppRenderer.renderFloorplan();
        AppRenderer.renderMetrics(true);
    },

    /**
     * Chế độ tiết kiệm điện: Chỉ bật thiết bị Inverter/Eco hoặc thiết bị thiết yếu
     */
    activateEcoMode() {
        AppState.rooms.forEach(room => {
            room.devices.forEach(device => {
                if (!device.isEco && device.type !== 'fridge') {
                    device.status = false;
                    device.powerCurrent = 0;
                } else if (device.status) {
                    device.powerCurrent = Math.round(device.powerNominal * 0.6);
                }
            });
        });

        // Tặng +20 điểm Eco và kích hoạt bounce animation
        AppState.household.ecoPoints += 20;
        const pill = document.querySelector('.eco-reward-pill');
        if (pill) AppRenderer.triggerAnimation(pill, 'bounce');

        if (typeof EnergyDataStore !== 'undefined') {
            EnergyDataStore.saveState(AppState);
        }

        AppRenderer.renderFloorplan();
        AppRenderer.renderMetrics(true);
        AppRenderer.showToast('Đã kích hoạt Eco Mode (+20 Điểm thưởng)!', 'success');
    },

    /**
     * GIẢ LẬP DÒNG ĐIỆN THỜI GIAN THỰC TỪNG GIÂY (1000ms)
     * Công suất dao động nhẹ, số kWh và tiền điện nhảy tăng dần theo thời gian thực
     */
    startRealtimeSimulation() {
        if (AppState.simulation.intervalId) {
            clearInterval(AppState.simulation.intervalId);
        }

        const impulseLed = document.getElementById('meter-impulse-led');

        AppState.simulation.intervalId = setInterval(() => {
            let totalActiveWatts = 0;
            let totalAddedKwh = 0;

            AppState.rooms.forEach(room => {
                room.devices.forEach(device => {
                    if (device.status) {
                        // Dao động công suất thực tế ±3%
                        const delta = (Math.random() * 0.06 - 0.03);
                        const newPower = Math.round(device.powerNominal * (0.8 + delta));
                        device.powerCurrent = Math.max(10, newPower);
                        totalActiveWatts += device.powerCurrent;

                        // Tích lũy điện năng tiêu thụ thực tế theo từng giây trôi qua:
                        // kWh = (Watts * seconds * speedMultiplier) / (3600 * 1000)
                        const addedKwh = (device.powerCurrent * 1 * AppState.speedMultiplier) / 3600000;
                        device.totalKwhMonth += addedKwh;
                        totalAddedKwh += addedKwh;
                    }
                });
            });

            // Chớp đèn xung công tơ điện tử nếu có thiết bị đang tiêu thụ
            if (totalActiveWatts > 0 && impulseLed) {
                impulseLed.classList.add('flash');
                setTimeout(() => impulseLed.classList.remove('flash'), 120);
            }

            // Ghi nhận tích lũy vào EnergyDataStore để đồng bộ sang Thống kê
            if (typeof EnergyDataStore !== 'undefined') {
                const totalKwh = EnergyCalculator.calculateTotalKwh(AppState.rooms);
                EnergyDataStore.recordLiveTick(totalAddedKwh, totalKwh, totalActiveWatts);
                EnergyDataStore.saveState(AppState, 'dashboard');
            }

            // Cập nhật số liệu trên thẻ thiết bị và trên tổng chỉ số
            AppRenderer.updateDevicePowersOnly();
            AppRenderer.renderMetrics(true);

        }, AppState.simulation.intervalMs);
    },

    /**
     * Tạm dừng hoặc tiếp tục mô phỏng realtime
     */
    toggleSimulation() {
        const btn = document.getElementById('btn-toggle-simulation');
        const statusText = document.getElementById('sim-status-text');

        if (AppState.simulation.isRunning) {
            clearInterval(AppState.simulation.intervalId);
            AppState.simulation.isRunning = false;
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Tiếp tục';
            if (statusText) statusText.textContent = 'Đang tạm dừng';
            AppRenderer.showToast('Đã tạm dừng mô phỏng thời gian thực', 'info');
        } else {
            AppState.simulation.isRunning = true;
            this.startRealtimeSimulation();
            if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Tạm dừng';
            if (statusText) statusText.textContent = `Thời gian thực (1s • ${AppState.speedMultiplier}x)`;
            AppRenderer.showToast('Đã tiếp tục mô phỏng thời gian thực', 'success');
        }
    }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    AppController.init();
});

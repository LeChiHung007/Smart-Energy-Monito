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

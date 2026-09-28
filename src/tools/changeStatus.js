const { SchemaType } = require("@google/generative-ai");
const { ActivityType } = require("discord.js");

module.exports = {
    declaration: {
        name: "thay_doi_trang_thai",
        description: "Thay đổi trạng thái (status / activity) hiển thị dưới tên của bot trên Discord.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                trang_thai: { 
                    type: SchemaType.STRING, 
                    description: "Nội dung trạng thái muốn đặt (ví dụ: 'đang ăn pizza', 'Minecraft', 'nhạc Lofi')" 
                },
                kieu_hoat_dong: {
                    type: SchemaType.STRING,
                    description: "Chọn 1 trong các kiểu: 'PLAYING' (Đang chơi), 'WATCHING' (Đang xem), 'LISTENING' (Đang nghe), 'CUSTOM' (Tùy chỉnh chữ tự do). Nên ưu tiên CUSTOM nếu là các hành động đời thường."
                }
            },
            required: ["trang_thai", "kieu_hoat_dong"]
        }
    },
    
    async execute({ trang_thai, kieu_hoat_dong }, messageContext) {
        try {
            // 1. KIỂM TRA QUYỀN CHỦ NHÂN
            const ownerId = '755052091088568401' //chaser;
            if (messageContext.author.id !== ownerId) {
                console.log(`[Bảo mật] ${messageContext.author.username} vừa cố đổi trạng thái bot.`);
                return { 
                    status: "forbidden", 
                    message: "TỪ CHỐI: Chỉ Chủ nhân (người tạo ra bạn) mới có quyền đổi trạng thái của bạn." 
                };
            }

            // 2. PHÂN LOẠI KIỂU HOẠT ĐỘNG
            let activityType = ActivityType.Custom;
            switch(kieu_hoat_dong.toUpperCase()) {
                case "PLAYING": activityType = ActivityType.Playing; break;
                case "WATCHING": activityType = ActivityType.Watching; break;
                case "LISTENING": activityType = ActivityType.Listening; break;
                case "CUSTOM": activityType = ActivityType.Custom; break;
            }

            const activityOptions = { type: activityType };
            
            // Discord API xử lý Custom Status (type 4) hơi khác biệt so với các loại khác
            if (activityType === ActivityType.Custom) {
                activityOptions.name = 'Custom Status';
                activityOptions.state = trang_thai;
            } else {
                activityOptions.name = trang_thai;
            }

            // 3. THỰC THI SET TRẠNG THÁI (Lấy client trực tiếp từ messageContext)
            messageContext.client.user.setPresence({
                activities: [activityOptions],
                status: 'online',
            });

            return { 
                status: "success", 
                message: `Đã đổi trạng thái thành công sang: ${trang_thai}. Hãy thông báo lại cho Chủ nhân.` 
            };

        } catch (error) {
            console.error("Lỗi khi đổi trạng thái:", error);
            return { status: "error", message: "Lỗi hệ thống khi cập nhật trạng thái." };
        }
    }
};
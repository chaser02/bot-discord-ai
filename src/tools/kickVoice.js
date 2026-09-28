const { SchemaType } = require("@google/generative-ai");

module.exports = {
    declaration: {
        name: "ngat_ket_noi_voice",
        description: "Ngắt kết nối (đá) một người dùng cụ thể khỏi kênh thoại họ đang tham gia.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                target_user: { 
                    type: SchemaType.STRING, 
                    description: "Tên hoặc ID hoặc chuỗi tag (ví dụ <@12345>) của người cần bị đá khỏi kênh thoại." 
                }
            },
            required: ["target_user"]
        }
    },
    
    // Đã thêm biến messageContext để Tool có thể thao tác với Server
    async execute({ target_user }, messageContext) {
        try {
            // 1. KIỂM TRA QUYỀN CHỦ NHÂN
            // const ownerId = process.env.OWNER_ID;
            // const ownerId2 = process.env.OWNER_ID2;
            // if (messageContext.author.id !== ownerId || messageContext.author.id !== ownerId2) {
            //     console.log(`[Bảo mật] Cảnh báo: ${messageContext.author.username} cố gắng dùng quyền Admin.`);
            //     return { 
            //         status: "forbidden", 
            //         message: "BẠN PHẢI TỪ CHỐI YÊU CẦU NÀY! Hãy nói rằng bạn chỉ nghe lệnh từ Chủ nhân." 
            //     };
            // }

            // 2. TÌM KIẾM NGƯỜI DÙNG BỊ CHỈ ĐỊNH
            // Xử lý chuỗi tag <@12345> thành số ID 12345
            const targetId = target_user.replace(/\D/g, ''); 
            
            // Tìm thành viên trong Server (Guild)
            let targetMember = null;
            if (targetId) {
                targetMember = await messageContext.guild.members.fetch(targetId).catch(() => null);
            } 
            // Nếu AI không truyền ID mà truyền tên (do người dùng gõ tên thay vì tag)
            else {
                const members = await messageContext.guild.members.fetch();
                targetMember = members.find(m => m.user.displayName.toLowerCase().includes(target_user.toLowerCase()) || m.user.username.toLowerCase().includes(target_user.toLowerCase()));
            }

            if (!targetMember) {
                return { status: "error", message: "Không tìm thấy người dùng này trong server." };
            }

            // 3. THỰC THI HÀNH ĐỘNG
            if (!targetMember.voice.channel) {
                return { status: "error", message: `${targetMember.displayName} hiện không ở trong kênh thoại nào cả.` };
            }

            await targetMember.voice.disconnect("Lệnh từ Chủ nhân thông qua AI.");
            
            return { 
                status: "success", 
                message: `Đã ngắt kết nối ${targetMember.displayName} thành công. Hãy báo cáo lại cho người dùng bằng giọng điệu ngầu hoặc đắc ý.` 
            };

        } catch (error) {
            console.error("Lỗi khi kick voice:", error);
            return { status: "error", message: "Lỗi hệ thống hoặc Bot không có quyền 'Move Members' trong Server." };
        }
    }
};
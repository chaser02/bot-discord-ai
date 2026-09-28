const { SchemaType } = require("@google/generative-ai");

module.exports = {
    declaration: {
        name: "xoa_tin_nhan",
        description: "Xóa/dọn dẹp một số lượng tin nhắn nhất định trong kênh chat. Có thể xóa tin nhắn của một người dùng cụ thể hoặc xóa chung tất cả.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                so_luong: { 
                    type: SchemaType.INTEGER, 
                    description: "Số lượng tin nhắn cần xóa (tối đa 100)." 
                },
                nguoi_dung: { 
                    type: SchemaType.STRING, 
                    description: "Tên, ID hoặc tag (ví dụ <@123>) của người cần bị xóa tin nhắn. Bỏ trống hoặc gửi chuỗi rỗng '' nếu muốn xóa tin nhắn của TẤT CẢ mọi người." 
                }
            },
            required: ["so_luong"]
        }
    },
    
    async execute({ so_luong, nguoi_dung }, messageContext) {
        try {
            // // 1. KIỂM TRA QUYỀN CHỦ NHÂN
            // const ownerId = process.env.OWNER_ID;
            // if (messageContext.author.id !== ownerId) {
            //     console.log(`[Bảo mật] ${messageContext.author.username} cố gắng xóa tin nhắn.`);
            //     return { 
            //         status: "forbidden", 
            //         message: "TỪ CHỐI: Chỉ Chủ nhân mới được phép yêu cầu tôi dọn dẹp tin nhắn." 
            //     };
            // }

            // Giới hạn an toàn của Discord là 100 tin nhắn mỗi lần quét
            const fetchLimit = 100;
            const amountToDelete = Math.min(so_luong, 100);

            // Lấy 100 tin nhắn gần nhất trong kênh
            const fetchedMessages = await messageContext.channel.messages.fetch({ limit: fetchLimit });
            let messagesToDelete = [];

            if (nguoi_dung && nguoi_dung.trim() !== '') {
                // NẾU CÓ CHỈ ĐỊNH NGƯỜI DÙNG
                const targetId = nguoi_dung.replace(/\D/g, ''); // Tách ID ra khỏi tag <@...>
                
                messagesToDelete = fetchedMessages.filter(m => {
                    if (targetId && m.author.id === targetId) return true;
                    // Hoặc khớp theo tên
                    return m.author.username.toLowerCase().includes(nguoi_dung.toLowerCase()) || 
                           (m.author.displayName && m.author.displayName.toLowerCase().includes(nguoi_dung.toLowerCase()));
                });
                
                // Lấy đúng số lượng được yêu cầu
                messagesToDelete = Array.from(messagesToDelete.values()).slice(0, amountToDelete);
            } else {
                // NẾU KHÔNG CHỈ ĐỊNH (Xóa chung)
                // Cộng thêm 1 để xóa luôn cả dòng lệnh chat hiện tại của người dùng
                messagesToDelete = Array.from(fetchedMessages.values()).slice(0, amountToDelete + 1);
            }

            if (messagesToDelete.length === 0) {
                return { status: "error", message: "Không tìm thấy tin nhắn nào phù hợp để xóa (hoặc tin nhắn đã quá 14 ngày tuổi)." };
            }

            // 3. THỰC THI XÓA BẰNG DISCORD API
            // Tham số 'true' ở cuối giúp bỏ qua các tin nhắn cũ hơn 14 ngày mà không báo lỗi crash bot
            const deleted = await messageContext.channel.bulkDelete(messagesToDelete, true);

            return { 
                status: "success", 
                message: `Đã dọn dẹp thành công ${deleted.size} tin nhắn theo yêu cầu. Hãy báo cáo lại cho người yêu cầu một cách tự hào.` 
            };

        } catch (error) {
            console.error("Lỗi khi xóa tin nhắn:", error);
            return { status: "error", message: "Không thể xóa tin nhắn. Có thể do bot thiếu quyền 'Quản lý tin nhắn' (Manage Messages) trong server." };
        }
    }
};
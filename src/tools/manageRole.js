const { SchemaType } = require("@google/generative-ai");

module.exports = {
    declaration: {
        name: "quan_ly_role",
        description: "Thêm (cấp) hoặc xóa (thu hồi) một role/vai trò của một người dùng cụ thể trong server.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                hanh_dong: { 
                    type: SchemaType.STRING, 
                    description: "Hành động cần thực hiện. Điền 'them' nếu muốn cấp role, điền 'xoa' nếu muốn gỡ role." 
                },
                nguoi_dung: { 
                    type: SchemaType.STRING, 
                    description: "Tên, ID hoặc tag (ví dụ <@123>) của người cần được cấp/xóa role." 
                },
                ten_role: {
                    type: SchemaType.STRING,
                    description: "Tên của role cần thao tác (ví dụ: 'supporter', 'admin', 'vip')."
                }
            },
            required: ["hanh_dong", "nguoi_dung", "ten_role"]
        }
    },
    
    async execute({ hanh_dong, nguoi_dung, ten_role }, messageContext) {
        try {
            // 1. KIỂM TRA QUYỀN CHỦ NHÂN
            const ownerId = '755052091088568401'; //chaser
            if (messageContext.author.id !== ownerId) {
                console.log(`[Bảo mật] ${messageContext.author.username} cố gắng thay đổi role.`);
                return { 
                    status: "forbidden", 
                    message: "TỪ CHỐI: Chỉ Chủ nhân mới được phép yêu cầu tôi quản lý chức vụ/role của người khác." 
                };
            }

            // 2. TÌM KIẾM NGƯỜI DÙNG BỊ CHỈ ĐỊNH
            const targetId = nguoi_dung.replace(/\D/g, ''); 
            let targetMember = null;
            if (targetId) {
                targetMember = await messageContext.guild.members.fetch(targetId).catch(() => null);
            } else {
                const members = await messageContext.guild.members.fetch();
                targetMember = members.find(m => 
                    m.user.displayName.toLowerCase().includes(nguoi_dung.toLowerCase()) || 
                    m.user.username.toLowerCase().includes(nguoi_dung.toLowerCase())
                );
            }

            if (!targetMember) {
                return { status: "error", message: "Không tìm thấy người dùng này trong server." };
            }

            // 3. TÌM KIẾM ROLE TRONG SERVER
            // Fetch toàn bộ role của server
            const roles = await messageContext.guild.roles.fetch();
            
            // Tìm role có tên khớp một phần hoặc toàn bộ (không phân biệt hoa thường)
            const targetRole = roles.find(r => r.name.toLowerCase().includes(ten_role.toLowerCase()));

            if (!targetRole) {
                return { status: "error", message: `Không tìm thấy chức vụ nào có tên chứa chữ '${ten_role}'.` };
            }

            // 4. THỰC THI THÊM / XÓA ROLE
            if (hanh_dong === 'them') {
                // Kiểm tra xem người dùng đã có role này chưa
                if (targetMember.roles.cache.has(targetRole.id)) {
                    return { status: "error", message: `\({targetMember.displayName} đã có sẵn chức vụ\){targetRole.name} rồi.` };
                }
                await targetMember.roles.add(targetRole);
                return { 
                    status: "success", 
                    message: `Đã cấp chức vụ '\({targetRole.name}' cho\){targetMember.displayName} thành công! Hãy báo cáo lại với chủ nhân.` 
                };
                
            } else if (hanh_dong === 'xoa') {
                if (!targetMember.roles.cache.has(targetRole.id)) {
                    return { status: "error", message: `\({targetMember.displayName} hiện không giữ chức vụ\){targetRole.name}.` };
                }
                await targetMember.roles.remove(targetRole);
                return { 
                    status: "success", 
                    message: `Đã thu hồi chức vụ '\({targetRole.name}' từ\){targetMember.displayName} thành công! Hãy báo cáo lại với chủ nhân.` 
                };
            }

            return { status: "error", message: "Hành động không hợp lệ. Chỉ chấp nhận 'them' hoặc 'xoa'." };

        } catch (error) {
            console.error("Lỗi khi quản lý role:", error);
            return { 
                status: "error", 
                message: "Không thể thao tác. Lỗi này thường do bot thiếu quyền 'Quản lý Vai trò' (Manage Roles) hoặc Role của bot đang nằm thấp hơn Role cần cấp." 
            };
        }
    }
};
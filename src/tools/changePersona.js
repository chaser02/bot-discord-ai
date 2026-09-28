const fs = require('fs');
const path = require('path');
const { SchemaType } = require("@google/generative-ai");

const personasPath = path.join(__dirname, '../../personas.json');

module.exports = {
    declaration: {
        name: "thay_doi_tinh_cach",
        description: "Lưu lại tính cách, vai diễn hoặc cách xưng hô đặc biệt khi một người dùng yêu cầu bạn thay đổi cách nói chuyện với riêng họ.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                user_id: { 
                    type: SchemaType.STRING, 
                    description: "ID của người dùng đang chat (lấy từ dữ liệu ngữ cảnh hệ thống cung cấp)" 
                },
                tinh_cach_moi: { 
                    type: SchemaType.STRING, 
                    description: "Mô tả chi tiết về tính cách, giọng điệu, và cách xưng hô mới mà người dùng yêu cầu." 
                }
            },
            required: ["user_id", "tinh_cach_moi"]
        }
    },
    
    async execute({ user_id, tinh_cach_moi }) {
        try {
            let personas = {};
            // Đọc file cũ nếu có
            if (fs.existsSync(personasPath)) {
                personas = JSON.parse(fs.readFileSync(personasPath, 'utf8'));
            }

            // Nếu người dùng yêu cầu "trở lại bình thường" hoặc "xóa tính cách"
            const keywords = ["xóa", "bình thường", "mặc định", "reset", "clear"];
            const isReset = keywords.some(kw => tinh_cach_moi.toLowerCase().includes(kw));

            if (isReset) {
                delete personas[user_id];
            } else {
                personas[user_id] = tinh_cach_moi;
            }

            // Lưu lại vào file JSON
            fs.writeFileSync(personasPath, JSON.stringify(personas, null, 4));
            
            console.log(`🎭 [Tính cách] Cập nhật vai diễn cho User ${user_id}: ${isReset ? 'Mặc định' : tinh_cach_moi}`);
            
            return { 
                status: "success", 
                message: isReset 
                    ? "Đã khôi phục tính cách về mặc định." 
                    : "Đã lưu tính cách mới. Kể từ câu trả lời tiếp theo, hãy giao tiếp với họ hoàn toàn bằng tính cách này." 
            };
        } catch (error) {
            console.error("Lỗi khi lưu tính cách:", error);
            return { status: "error", message: "Không thể lưu tính cách lúc này." };
        }
    }
};
const fs = require('fs');
const path = require('path');

const knowledgePath = path.join(__dirname, '../../knowledge.json');

module.exports = {
    declaration: {
        name: "ghi_nho_thong_tin", // Tên hàm khai báo của bạn
        description: "Lưu trữ thông tin quan trọng về người dùng.",
        parameters: {
            type: "OBJECT",
            properties: {
                userName: { type: "STRING" },
                fact: { type: "STRING" }
            },
            required: ["userName", "fact"]
        }
    },
    async execute(args, messageContext) {
        const { userName, fact } = args;
        
        // Nhận diện Server ID, nếu chat riêng (DM) thì lưu vào hòm 'DM'
        const guildId = messageContext && messageContext.guild ? messageContext.guild.id : "DM";
        
        let data = {};
        if (fs.existsSync(knowledgePath)) {
            data = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        }

        // Tạo 'phòng' mới nếu server này chưa từng có dữ liệu
        if (!data[guildId]) {
            data[guildId] = {};
        }
        
        // Thêm thông tin mới vào phòng của server đó
        if (data[guildId][userName]) {
            data[guildId][userName] += ` | ${fact}`;
        } else {
            data[guildId][userName] = fact;
        }

        fs.writeFileSync(knowledgePath, JSON.stringify(data, null, 4));
        console.log(`🧠 [Trí nhớ mới] Đã ghi nhớ về ${userName}: ${fact}`);
        return { status: "success", message: `Đã lưu thông tin của ${userName} thành công vào bộ nhớ của Server hiện tại.` };
    }
};

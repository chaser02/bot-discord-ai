const { generateAIResponse } = require("../gemini");
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { speakInVoice, getVoiceMode, setVoiceMode, playGreeting, playGoodbye } = require('../voice');
const { EmbedBuilder } = require('discord.js'); // BỔ SUNG DÒNG NÀY

const PREFIX = '>';

module.exports = async (message, client) => {
    if (message.author.bot || message.system) return;

    const isDM = message.channel.isDMBased();
    const isMentioned = message.mentions.has(client.user, { ignoreRoles: true, ignoreEveryone: true });
    //const isThread = message.channel.isThread();
    const hasPrefix = message.content.startsWith(PREFIX);

    if (isDM || isMentioned || hasPrefix) {
        // ==========================================
        // LỚP KHIÊN BẢO VỆ CHỐNG CRASH (NÂNG CẤP)
        // ==========================================
        if (!isDM) {
            const botPermissions = message.channel.permissionsFor(client.user);
            // Kiểm tra 3 quyền thiết yếu: Gửi tin nhắn, Nhúng link (để gửi bảng help), và Đọc lịch sử (để reply)
            if (!botPermissions || 
                !botPermissions.has('SendMessages') || 
                !botPermissions.has('EmbedLinks') || 
                !botPermissions.has('ReadMessageHistory')) {
                console.log(`[Bảo mật] Bỏ qua lệnh tại kênh '${message.channel.name}' vì bot thiếu quyền cơ bản (SendMessages, EmbedLinks, hoặc ReadMessageHistory).`);
                return; // Dừng lại ngay lập tức để không bị crash
            }
        }
        // ==========================================
        // ==========================================
        // TẠO LOG CONSOLE (CÓ TÊN SERVER)
        // ==========================================
        const timeLog = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const serverName = message.guild ? message.guild.name : "Khu vực DM";
        const channelName = isDM ? "Tin nhắn riêng" : message.channel.name;

        console.log(`\n[\(${timeLog}]\) 🔔 [Server:${serverName} | Kênh: ${channelName}]`);
        console.log(`👤 \(${message.author.tag}\): "${message.content}"`);
        // ==========================================
        let cleanMessage = message.content;

        if (cleanMessage.startsWith(PREFIX)) {
            cleanMessage = cleanMessage.slice(PREFIX.length).trim();
            // ==========================================
            // XỬ LÝ LỆNH THOẠI TRỰC TIẾP TỪ PREFIX (.join / .leave)
            // ==========================================
            const commandCheck = cleanMessage.toLowerCase();
            // XỬ LÝ LỆNH .HELP TRUYỀN THỐNG
            // ==========================================
            if (commandCheck === 'help') {
                const helpEmbed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('🎀 XIN CHÀO, MÌNH LÀ REI!')
                    .setDescription('Mình là một trợ lý AI tự chủ được thiết kế như một thành viên trong server và có thể hỗ trợ bạn trong nhiều lĩnh vực, mình có thể đọc file, xem ảnh, lướt web, truy cập internet thời gian thực và quản lý cộng đồng (đang phát triển) để đưa ra câu trả lời bằng ngôn ngữ tự nhiên!')
                    .addFields(
                        { name: '🌟 MÌNH CÓ THỂ LÀM GÌ?', value: '**1. Trò chuyện & Ghi nhớ:** Giao tiếp tự nhiên, ghi nhớ sở thích, chức vụ và tên gọi.\n**2. Đa phương tiện:** Phân tích ảnh, lướt web, tóm tắt nội dung, đọc video YouTube.\n**3. Tương tác Voice:** Sẵn sàng tham gia kênh thoại cùng mọi người.\n**4. Quản trị viên:** Dọn dẹp tin nhắn, cấp/xóa Role, đá đít người dùng (Chỉ nghe lệnh Admin).' },
                        { name: '🛠️ CÁCH GỌI MÌNH', value: '**Chat bình thường:** Tag bot hoặc dùng dấu `>` ở đầu câu (Ví dụ: `>Rei, thời tiết Hà Nội hôm nay thế nào?`).\n\n**Danh sách lệnh ẩn (Slash):**\n`/help` - Xem bảng hướng dẫn này.\n`/chat` - Mở một Thread riêng tư để tâm sự.\n`/clear` - Xóa trí nhớ ngắn hạn để đổi chủ đề.\n`/join` & `/leave` - Gọi bot vào/ra kênh thoại.' }
                    )
                    .setFooter({ text: 'Lưu ý: Không spam, không gọi Rei liên tục trong 1 ngày nếu không muốn bị ignore nhé, AI cũng là con người mà :\'((!' });

                return message.reply({ embeds: [helpEmbed], failIfNotExists: false });
            }
            // 2. THÊM LỆNH !VOICEMOD (Gõ tay)
            // ==========================================
            if (cleanMessage.toLowerCase() === 'voicemod' || cleanMessage.toLowerCase() === 'voicemode') {
                if (message.author.id !== process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID2) {
                    return message.reply({ content: '❌ TỪ CHỐI: Chỉ sếp mới có quyền bật/tắt chiếc mỏ của tôi!', failIfNotExists: false });
                }

                const currentState = getVoiceMode();
                setVoiceMode(!currentState);

                return message.reply({
                    content: `🎙️ Chế độ giọng nói đã được **${!currentState ? 'BẬT' : 'TẮT'}**.\n(Lưu ý: Tôi sẽ chỉ nói khi bạn chat vào đúng kênh văn bản của phòng thoại tôi đang đứng).`,
                    failIfNotExists: false
                });
            }
            // ... [Tìm đến chỗ xử lý lệnh và sửa lại như sau] ...
            if (commandCheck === 'join') {
                const voiceChannel = message.member?.voice.channel;
                if (!voiceChannel) return message.reply('❌ Bạn phải vào một kênh thoại trước!');

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                message.reply(`🔊 Đã tham gia kênh **${voiceChannel.name}**!`);

                // Gọi bot chào mọi người
                const userName = message.author.globalName || message.author.displayName || message.author.username;
                playGreeting(connection, voiceChannel, message.author.id, userName);
                return;
            }

            if (commandCheck === 'leave') {
                const connection = getVoiceConnection(message.guild.id);
                if (connection) {
                    message.reply('🔇 Đang nói lời tạm biệt...');
                    const userName = message.author.globalName || message.author.displayName || message.author.username;

                    // Chờ bot nói tạm biệt xong thì mới ngắt kết nối
                    await playGoodbye(connection, message.author.id, userName);
                    connection.destroy();
                    return;
                }
                return message.reply('❌ Tôi chưa vào kênh thoại nào cả.');
            }
            
        }

        await message.channel.sendTyping();

        cleanMessage = cleanMessage.replace(`<@${client.user.id}>`, '').trim();
        const userName = message.author.globalName || message.author.displayName || message.author.username;

        if (!cleanMessage && message.attachments.size === 0) {
            return message.reply(`Chào ${userName}, bạn muốn tôi giúp gì nào?`);
        }

        message.mentions.users.forEach(user => {
            if (user.id !== client.user.id) {
                const name = user.globalName || user.username;
                cleanMessage = cleanMessage.replace(`<@${user.id}>`, `@${name}`);
            }
        });

        // Xử lý đọc file và ảnh
        const imageParts = [];
        let appendedText = "";

        if (message.attachments.size > 0) {
            for (const [id, attachment] of message.attachments) {
                const contentType = attachment.contentType || "";
                try {
                    if (contentType.startsWith('image/')) {
                        const response = await fetch(attachment.url);
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType: contentType } });
                    } else if (contentType.startsWith('text/') || contentType === 'application/json' || attachment.name.match(/\.(js|py|html|css|cpp)$/)) {
                        const response = await fetch(attachment.url);
                        const fileContent = await response.text();
                        appendedText += `\n\n--- [Nội dung file: ${attachment.name}] ---\n${fileContent}\n-------------------`;
                    }
                } catch (err) {
                    console.error(`Lỗi file:`, err);
                }
            }
        }

        const finalMessage = cleanMessage + appendedText;

        try {
            // Truyền thêm object message (bản thân tin nhắn) vào hàm AI
            const aiResponse = await generateAIResponse(
                message.author.id,
                userName,
                finalMessage,
                imageParts,
                message // BỔ SUNG THAM SỐ NÀY
            );
            await message.reply({
                content: aiResponse,
                failIfNotExists: false
            });
            // ==========================================
            // KÍCH HOẠT CHẾ ĐỘ ĐỌC CHAT BẰNG GIỌNG NÓI
            // ==========================================
            if (!isDM && getVoiceMode()) {
                const connection = getVoiceConnection(message.guild.id);
                // Nếu bot ĐANG trong voice và lệnh được gõ ở ĐÚNG KÊNH TEXT của phòng voice đó
                if (connection && connection.joinConfig.channelId === message.channel.id) {
                    await speakInVoice(connection, aiResponse);
                }
            }
            // ==========================================
        } catch (error) {
            console.error("Lỗi:", error);
            await message.reply({
                content: "Xin lỗi, tôi đang gặp lỗi khi phân tích dữ liệu.",
                failIfNotExists: false
            });
        }
    }
};
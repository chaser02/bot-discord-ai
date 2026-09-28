const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { clearMemory } = require('../gemini');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { setVoiceMode, getVoiceMode, setVoiceId } = require('../voice');
module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('clear')
            .setDescription('Xóa trí nhớ của bot trong kênh/thread này để bắt đầu chủ đề mới'),
        async execute(interaction) {
            clearMemory(interaction.channelId);
            await interaction.reply({ content: '🧹 Đã dọn dẹp sạch sẽ trí nhớ tại kênh này!', flags: MessageFlags.Ephemeral });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('chat')
            .setDescription('Tạo một Thread riêng tư để chat với AI không bị loãng kênh')
            .addStringOption(option => 
                option.setName('topic')
                    .setDescription('Chủ đề bạn muốn nói chuyện')
                    .setRequired(true)),
        async execute(interaction) {
            const topic = interaction.options.getString('topic');
            const thread = await interaction.channel.threads.create({
                name: `💬 ${topic}`,
                autoArchiveDuration: 60,
                reason: 'Mở luồng chat AI',
            });
            await interaction.reply({ content: `Đã tạo không gian riêng tại ${thread}`, flags: MessageFlags.Ephemeral });
            await thread.send(`Chào <@${interaction.user.id}>, chúng ta đang ở trong không gian riêng. Bạn muốn bàn về "${topic}" đúng không?`);
        }
    },
    // ==========================================
    // LỆNH KÊNH THOẠI (VOICE)
    // ==========================================
    {
        data: new SlashCommandBuilder()
            .setName('join')
            .setDescription('Gọi bot vào kênh thoại bạn đang đứng'),
        async execute(interaction) {
            const voiceChannel = interaction.member.voice.channel;
            
            if (!voiceChannel) {
                return interaction.reply({ content: '❌ Bạn phải tham gia vào một kênh thoại trước!', flags: MessageFlags.Ephemeral });
            }

            try {
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                await interaction.reply(`🔊 Đã bay vào kênh **${voiceChannel.name}** cùng bạn!`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi cố gắng kết nối.', flags: MessageFlags.Ephemeral });
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('leave')
            .setDescription('Yêu cầu bot rời khỏi kênh thoại'),
        async execute(interaction) {
            const connection = getVoiceConnection(interaction.guild.id);
            
            if (!connection) {
                return interaction.reply({ content: '❌ Tôi có đang ở trong kênh thoại nào đâu?', flags: MessageFlags.Ephemeral });
            }
            
            connection.destroy();
            await interaction.reply('🔇 Đã rời khỏi kênh thoại. Hẹn gặp lại!');
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Xem bảng hướng dẫn chi tiết cách sử dụng và các tính năng của Rei'),
        async execute(interaction) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // Màu nền tối tiệp với màu của Discord
                .setTitle('🎀 XIN CHÀO, MÌNH LÀ REI!')
                .setDescription('Mình là một trợ lý AI tự chủ được thiết kế như một thành viên trong server và có thể hỗ trợ bạn trong nhiều lĩnh vực, mình có thể đọc file, xem ảnh, lướt web, truy cập internet thời gian thực và quản lý cộng đồng (đang phát triển) để đưa ra câu trả lời bằng ngôn ngữ tự nhiên!')
                .addFields(
                    { 
                        name: '🌟 MÌNH CÓ THỂ LÀM GÌ?', 
                        value: '**1. Trò chuyện & Ghi nhớ:** Giao tiếp tự nhiên, ghi nhớ sở thích, chức vụ và tên gọi.\n**2. Đa phương tiện:** Phân tích ảnh, lướt web, tóm tắt nội dung, đọc video YouTube.\n**3. Tương tác Voice:** Sẵn sàng tham gia kênh thoại cùng mọi người.\n**4. Quản trị viên:** Dọn dẹp tin nhắn, đá đít người dùng (Chỉ nghe lệnh Admin).' 
                    },
                    { 
                        name: '🛠️ CÁCH GỌI MÌNH', 
                        value: '**Chat bình thường:** Tag bot hoặc dùng dấu `>` ở đầu câu (Ví dụ: `>Rei, thời tiết Hà Nội hôm nay thế nào?`).\n\n**Danh sách lệnh ẩn (Slash):**\n`/help` - Xem bảng hướng dẫn này.\n`/chat` - Mở một Thread riêng tư để tâm sự.\n`/clear` - Xóa trí nhớ ngắn hạn để đổi chủ đề.\n`/join` & `/leave` - Gọi bot vào/ra kênh thoại.' 
                    }
                )
                .setFooter({ text: 'Lưu ý: Không spam, không gọi Rei liên tục trong 1 ngày nếu không muốn bị ignore nhé, AI cũng là con người mà :\'((!' });

            await interaction.reply({ embeds: [helpEmbed] });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('voicemode')
            .setDescription('Bật/Tắt chế độ bot đọc tin nhắn bằng giọng nói (Chỉ dành cho Chủ nhân)'),
        async execute(interaction) {
            // Khóa bảo mật: Chỉ Chủ nhân mới được bật/tắt
            if (interaction.user.id !== process.env.OWNER_ID && interaction.user.id !== process.env.OWNER_ID2) {
                return interaction.reply({ 
                    content: '❌ TỪ CHỐI: Chỉ sếp mới có quyền bật/tắt chiếc mỏ của tôi!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const currentState = getVoiceMode();
            setVoiceMode(!currentState);
            
            await interaction.reply({ 
                content: `🎙️ Chế độ giọng nói đã được **${!currentState ? 'BẬT' : 'TẮT'}**.\n(Lưu ý: Tôi sẽ chỉ nói khi bạn chat vào đúng kênh văn bản của phòng thoại tôi đang đứng).`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('setvoice')
            .setDescription('Thay đổi giọng nói của Rei (Dùng giọng có sẵn hoặc nhập ID tùy chỉnh)')
            .addStringOption(option =>
                option.setName('preset')
                    .setDescription('Chọn 1 trong các giọng có sẵn')
                    .addChoices(
                        { name: 'Trâm (Nữ, Sài Gòn)', value: 'default' },
                        { name: 'Oanh (Nữ, Hà Nội)', value: 'xeRzNgA5BGMAmllSnOuF' },
                        { name: 'Anh (Nam, Hà Nội)', value: 'ywBZEqUhld86Jeajq94o' },
                        { name: 'Duyên (Nữ, Giọng miền nam)', value: '1rqNHUqUbBGpY3OyzPMI' }
                    ))
            .addStringOption(option =>
                option.setName('custom_id')
                    .setDescription('Hoặc dán trực tiếp Voice ID từ ElevenLabs vào đây')),
        async execute(interaction) {
            const presetId = interaction.options.getString('preset');
            const customId = interaction.options.getString('custom_id');
            
            // Ưu tiên custom_id nếu người dùng nhập, nếu không thì lấy preset, nếu không nhập gì thì báo lỗi
            const newVoiceId = customId || presetId;

            if (!newVoiceId) {
                return interaction.reply({ 
                    content: '❌ Bạn phải chọn một giọng có sẵn hoặc nhập Voice ID tùy chỉnh!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            setVoiceId(newVoiceId);
            
            await interaction.reply({ 
                content: `🎙️ Đã cập nhật thành công giọng nói mới! (Voice ID: \`${newVoiceId}\`)` 
            });
        }
    }
];
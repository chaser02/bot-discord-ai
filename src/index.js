require('dotenv').config();
// Cập nhật phần khai báo ở đầu file src/index.js
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const handleMessageCreate = require('./events/messageCreate');
const commands = require('./commands/core');

const commandsMap = new Map();
commands.forEach(cmd => commandsMap.set(cmd.data.name, cmd));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.GuildVoiceStates, // QUAN TRỌNG: Thêm quyền nhận diện kênh thoại
        GatewayIntentBits.GuildMembers // QUAN TRỌNG: Thêm quyền đọc danh sách thành viên
    ],
    partials: [
        Partials.Channel, 
        Partials.Message
    ]
});

// ... [Giữ nguyên toàn bộ code bên dưới] ...

client.once('clientReady', async () => {
    console.log(`✅ Điệp viên AI [${client.user.tag}] đã online!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(cmd => cmd.data.toJSON()) }
        );
        console.log('✅ Đã đồng bộ Slash Commands thành công.');
    } catch (error) {
        console.error('Lỗi đồng bộ lệnh:', error);
    }
});

client.on('messageCreate', (message) => {
    handleMessageCreate(message, client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Lúc này commandsMap đã tồn tại nên bot sẽ không bị crash
    const command = commandsMap.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Đã xảy ra lỗi khi thực thi lệnh này.', flags: MessageFlags.Ephemeral });
    }
});

client.login(process.env.DISCORD_TOKEN);
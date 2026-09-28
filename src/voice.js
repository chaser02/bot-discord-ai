const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const stream = require('stream');
const { generateAIResponse } = require('./gemini'); //

let isVoiceModeEnabled = false;

// 1. KHỞI TẠO BIẾN LƯU VOICE ID VÀ DANH SÁCH GIỌNG CÓ SẴN
let currentVoiceId = process.env.ELEVENLABS_VOICE_ID;

const voicePresets = {
    "default": process.env.ELEVENLABS_VOICE_ID,
    "oanh": "xeRzNgA5BGMAmllSnOuF",    // Nữ, Hà Nội
    "anh": "ywBZEqUhld86Jeajq94o",      // Nam, Hà Nội
    "duyen": "1rqNHUqUbBGpY3OyzPMI"    // Nữ, Giọng miền nam
};

function setVoiceId(id) {
    currentVoiceId = id;
}

function getVoiceId() {
    return currentVoiceId;
}

function setVoiceMode(state) {
    isVoiceModeEnabled = state;
}

function getVoiceMode() {
    return isVoiceModeEnabled;
}

async function speakInVoice(connection, text) {
    return new Promise(async (resolve) => {
        try {
            // Dọn dẹp text triệt để trước khi đưa vào ElevenLabs
            const cleanText = text
                // 1. Xóa mã Custom Emoji của Discord (VD: <:pepe:123> hoặc )
                .replace(/``/g, '')
                // 2. Xóa các tên emoji dạng chữ ngắn (VD: :pepe_cry: hoặc :smile:)
                .replace(/:\w+:/g, '')
                // 3. Xóa toàn bộ Emoji tiêu chuẩn (Unicode / Icon điện thoại như 😭, ✨, 🎀)
                .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
                // 4. Xóa các ký tự markdown định dạng chữ
                .replace(/[*_~`#]/g, '')
                // 5. Tránh đọc nguyên dải URL dài ngoằng
                .replace(/(https?:\/\/[^\s]+)/g, 'một đường link')
                .trim();

            if (!cleanText) {
                resolve();
                return;
            }

            // 2. SỬ DỤNG HÀM getVoiceId() THAY VÌ LẤY CỨNG TỪ .ENV
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${getVoiceId()}/stream`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: cleanText,
                    model_id: "eleven_turbo_v2_5",
                    voice_settings: {
                        stability: 0.75, similarity_boost: 0.75, style: 0.0
                    }
                })
            });

            if (!response.ok) {
                console.error("Lỗi ElevenLabs:", await response.text());
                resolve();
                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const readable = new stream.PassThrough();
            readable.end(buffer);

            const resource = createAudioResource(readable);
            const player = createAudioPlayer();

            connection.subscribe(player);
            player.play(resource);

            player.on(AudioPlayerStatus.Idle, () => resolve());
            player.on('error', error => {
                console.error('Lỗi Audio Player:', error);
                resolve();
            });
        } catch (error) {
            console.error("Lỗi phát giọng nói:", error);
            resolve();
        }
    });
}

// Kịch bản Chào hỏi (Luôn phát khi Join, không phụ thuộc vào Voice Mode)[cite: 7]
async function playGreeting(connection, channel, userId, userName) { //[cite: 7]
    const members = channel.members.filter(m => !m.user.bot).map(m => m.user.displayName).join(', '); //[cite: 7]

    const prompt = `[YÊU CẦU HỆ THỐNG]: Bạn vừa bước vào phòng Voice Chat. Hãy viết 1 câu chào thật ngắn gọn, tự nhiên, và có thể hơi tấu hài (dưới 30 chữ) để nói bằng giọng nói. Hãy cố gắng điểm danh tên những người đang ở đây: ${members}`; //[cite: 7]

    const aiText = await generateAIResponse(userId, userName, prompt); //[cite: 7]
    console.log(`[Voice] Gửi lời chào: ${aiText}`); //[cite: 7]

    await speakInVoice(connection, aiText); //[cite: 7]
}

// Kịch bản Tạm biệt (Luôn phát khi Leave, không phụ thuộc vào Voice Mode)[cite: 7]
async function playGoodbye(connection, userId, userName) { //[cite: 7]
    const prompt = `[YÊU CẦU HỆ THỐNG]: Hãy viết 1 câu tạm biệt thật ngắn gọn (dưới 20 chữ) để nói bằng giọng nói trước khi bạn rời khỏi phòng Voice Chat.`; //[cite: 7]

    const aiText = await generateAIResponse(userId, userName, prompt); //[cite: 7]
    console.log(`[Voice] Tạm biệt: ${aiText}`); //[cite: 7]

    await speakInVoice(connection, aiText); //[cite: 7]
}

module.exports = {
    speakInVoice, playGreeting, playGoodbye,
    setVoiceMode, getVoiceMode,
    setVoiceId, getVoiceId, voicePresets
};
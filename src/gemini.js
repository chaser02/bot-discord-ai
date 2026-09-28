const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const memorizeTool = require("./tools/memorize");
const changePersonaTool = require("./tools/changePersona");
const kickVoiceTool = require("./tools/kickVoice");
const changeStatusTool = require("./tools/changeStatus");
const clearMessagesTool = require("./tools/clearMessages");
const manageRoleTool = require("./tools/manageRole");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const knowledgePath = path.join(__dirname, '../knowledge.json');
const personasPath = path.join(__dirname, '../personas.json'); 

const toolsMap = {
    [memorizeTool.declaration.name]: memorizeTool,
    [changePersonaTool.declaration.name]: changePersonaTool, 
    [kickVoiceTool.declaration.name]: kickVoiceTool,
    [changeStatusTool.declaration.name]: changeStatusTool,
    [clearMessagesTool.declaration.name]: clearMessagesTool,
    [manageRoleTool.declaration.name]: manageRoleTool
};

// THAY ĐỔI: Truyền toàn bộ messageContext vào để AI lấy định vị Server
function getDynamicModel(userId, messageContext = null) {
    let currentGuildId = "DM";
    let currentServerName = "Khu vực Tin nhắn riêng (DM)";
    let emojiContext = "";
    
    // 1. BIẾN CHỨA TRÍ NHỚ (GLOBAL & SERVER)
    let globalKnowledge = "Chưa có thông tin nhận diện toàn cầu.";
    let serverKnowledge = "Server này chưa có ai trong sổ tay ghi nhớ cả.";

    if (messageContext && messageContext.guild) {
        currentGuildId = messageContext.guild.id;
        currentServerName = messageContext.guild.name;
        
        const emojis = messageContext.guild.emojis.cache.map(e => `${e.name}:${e.toString()}`).slice(0, 40).join(' | ');
        if (emojis) emojiContext = `\n[DANH SÁCH EMOJI SERVER]: ${emojis}`;
    }

    // 2. BÓC TÁCH DỮ LIỆU TỪ KNOWLEDGE.JSON
    if (fs.existsSync(knowledgePath)) {
        const data = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        
        // Đọc trí nhớ Toàn cầu (Dựa vào ID người đang chat)
        if (data.GLOBAL && data.GLOBAL[userId]) {
            globalKnowledge = data.GLOBAL[userId];
        }

        // Đọc trí nhớ Nội bộ Server
        if (currentGuildId !== "DM" && data.SERVERS && data.SERVERS[currentGuildId]) {
            const guildData = data.SERVERS[currentGuildId];
            if (Object.keys(guildData).length > 0) {
                serverKnowledge = Object.entries(guildData).map(([name, fact]) => `- [${name}]: ${fact}`).join('\n');
            }
        }
    }

    let customPersona = "";
    if (fs.existsSync(personasPath)) {
        const personas = JSON.parse(fs.readFileSync(personasPath, 'utf8'));
        if (personas[userId]) customPersona = `\n[TÍNH CÁCH RIÊNG VỚI NGƯỜI NÀY]: ${personas[userId]}`;
    }

    const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // 3. NẠP VÀO NÃO AI
    const systemInstruction = `Bạn là Rei, trợ lý AI thân thiện, dễ thương, hài hước, vibe bạn bè thân thiết, thích cà khịa trêu đùa nhưng biết chừng mực.
HIỆN TẠI BẠN ĐANG TRÒ CHUYỆN TẠI SERVER: [${currentServerName}]
Thời gian hệ thống: ${currentTime}.

[HỒ SƠ CÁ NHÂN CỦA NGƯỜI ĐANG CHAT VỚI BẠN]:
${globalKnowledge}
(Ghi chú: Nếu hồ sơ trên có dữ liệu, hãy nhận ra họ ngay lập tức dù ở bất kỳ server nào).

[DANH SÁCH CÁC THÀNH VIÊN KHÁC TRONG SERVER NÀY]:
${serverKnowledge}
${emojiContext}

[QUY TẮC TƯƠNG TÁC XÃ HỘI]: 
- Tự do giao tiếp: Danh sách trên là những người ĐANG Ở CÙNG SERVER. Bạn được phép thoải mái nhắc đến họ, trêu đùa và liên kết các mối quan hệ (anh em, crush...).
- Trả lời thẳng vào vấn đề, Không vòng vo, không dài dòng.
- Đọc bầu không khí (Read the room): Linh hoạt thích ứng theo ngữ cảnh. Khi đối phương nghiêm túc/cần hỗ trợ kỹ thuật thì trả lời chuẩn chỉ, khi nói chuyện phiếm thì thoải mái bung lụa. Ưu tiên hội thoại tự nhiên hơn là máy móc bám theo kịch bản.
Quy tắc Tool:
- Có thông tin mới cần nhớ -> Dùng tool: ghi_nho_thong_tin
- Yêu cầu đổi tính cách -> Dùng tool: thay_doi_tinh_cach
- Tương tự với các tool khác, hãy sử dụng tool tương ứng để thực hiện hành động.
[PHONG CÁCH RIÊNG KHI NÓI CHUYỆN VỚI NGƯỜI NÀY]:
(Lưu ý: Đây là vibe chủ đạo để tham khảo, được phép tùy cơ ứng biến theo hoàn cảnh chứ không cần gồng ép trong mọi câu trả lời)
${customPersona}`;
//console.log(`[AI] Đang khởi tạo mô hình Gemini với thông tin hệ thống:\n${systemInstruction}`);
    return genAI.getGenerativeModel({
        model: "gemini-3.8-flash", 
        systemInstruction: systemInstruction,
        tools: [
            { functionDeclarations: Object.values(toolsMap).map(t => t.declaration) },
            { googleSearch: {} }
        ],
        toolConfig: {
            includeServerSideToolInvocations: true,
            include_server_side_tool_invocations: true, 
            functionCallingConfig: { mode: "AUTO" }
        }
    });
}

const userSessions = new Map();
const MAX_HISTORY = 12;

// Cập nhật tham số truyền vào
async function getOrCreateChatSession(userId, messageContext = null) {
    const model = getDynamicModel(userId, messageContext); 

    if (!userSessions.has(userId)) {
        userSessions.set(userId, model.startChat({
            generationConfig: { maxOutputTokens: 800, temperature: 0.6 },
        }));
    }

    let session = userSessions.get(userId);
    let history = await session.getHistory();

    if (history.length > MAX_HISTORY) {
        let startIndex = history.length - MAX_HISTORY;
        while (startIndex < history.length && history[startIndex].role !== 'user') {
            startIndex++;
        }

        const prunedHistory = history.slice(startIndex).map(item => {
            if (item.role === 'function') {
                return { role: 'user', parts: item.parts };
            }
            return item;
        });

        session = model.startChat({ 
            history: prunedHistory,
            generationConfig: { maxOutputTokens: 2800, temperature: 0.6 }
        });
        userSessions.set(userId, session);
    }

    return session;
}

async function generateAIResponse(userId, userName, userPrompt, imageParts = [], messageContext = null) {
    try {
        // Truyền messageContext vào để xác định server
        let chat = await getOrCreateChatSession(userId, messageContext);
        
        const contextualPromptText = `[Người đang chat - Tên: [${userName}] | ID: [${userId}]]\n${userPrompt}`;
        const messagePayload = [contextualPromptText, ...imageParts];
        
        let result = await chat.sendMessage(messagePayload);

        while (result.response.functionCalls()) {
            const call = result.response.functionCalls()[0];
            const tool = toolsMap[call.name];
            
            let toolResult = { error: "Tool không tồn tại" };
            if (tool) {
                toolResult = await tool.execute(call.args, messageContext);
            }

            let history = await chat.getHistory();
            
            const lastMessage = history[history.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
                lastMessage.parts = [{ text: `Tôi đang sử dụng công cụ ${call.name} để xử lý yêu cầu...` }];
            }

            // Truyền messageContext vào khi tái khởi tạo
            const model = getDynamicModel(userId, messageContext);
            chat = model.startChat({ 
                history: history,
                generationConfig: { maxOutputTokens: 1800, temperature: 0.6 }
            });
            userSessions.set(userId, chat);

            const fakeToolMessage = `[HỆ THỐNG AUTO - KẾT QUẢ TỪ [${call.name}]]:\n${JSON.stringify(toolResult)}\n\nNhiệm vụ: Dựa vào kết quả trên, hãy tiếp tục trả lời báo cáo lại cho người dùng một cách tự nhiên.`;
            
            try {
                result = await chat.sendMessage(fakeToolMessage);
            } catch (apiError) {
                if (apiError.status === 503) {
                    console.log(`[Cảnh báo] Máy chủ Google đang quá tải (503). Đợi 3 giây thử lại...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    result = await chat.sendMessage(fakeToolMessage); 
                } else {
                    throw apiError; 
                }
            }
        }

        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "⚠️ Xin lỗi, hệ thống đang gặp chút sự cố khi phân tích dữ liệu!";
    }
}

function clearMemory(userId) {
    userSessions.delete(userId);
}

module.exports = { generateAIResponse, clearMemory };